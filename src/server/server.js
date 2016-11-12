const fs = require('fs');
const path = require('path');

const express = require('express');

const config = require('./config');
const faviconAsBase64 = require('./faviconAsBase64');
const pageTitle = require('./pageTitle');
const pathToSnapshot = require('./pathToSnapshot');
const reviewDemoData = require('../reviewDemoData');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname, '../../views'));
app.use(express.static(path.resolve(__dirname, '../../public')));

const CSS_FILE_PATH = path.join(__dirname, '../../public/happo-styles.css');
const JS_FILE_PATH = path.join(__dirname, '../../public/HappoApp.bundle.js');

function prepareViewData(data) {
  return Object.assign({}, {
    favicon: faviconAsBase64,
    css: fs.readFileSync(CSS_FILE_PATH, 'utf8'),
    jsCode: fs.readFileSync(JS_FILE_PATH, 'utf8'),
  }, data);
}

app.get('/snapshot', (request, response) => {
  response.render('snapshot', prepareViewData({
    sourceFiles: config.sourceFiles,
    stylesheets: config.stylesheets,
    debugMode: !!request.query.description,
  }));
});

app.get('/resource', (request, response) => {
  const file = request.query.file;
  if (file.startsWith('http')) {
    response.redirect(file);
  } else {
    // TODO: add security...
    response.sendFile(path.join(process.cwd(), file));
  }
});

app.get('/debug', (request, response) => {
  response.render('debug', prepareViewData({
    sourceFiles: config.sourceFiles,
  }));
});

function reviewImageUrl(image, fileName) {
  const pathToFile = pathToSnapshot(Object.assign({}, image, { fileName }));
  return `/resource?file=${encodeURIComponent(pathToFile)}`;
}

app.get('/review', (request, response) => {
  const resultSummaryJSON = fs.readFileSync(
    path.join(config.snapshotsFolder, config.resultSummaryFilename),
    'utf8'
  );
  const resultSummary = JSON.parse(resultSummaryJSON);
  const title = pageTitle(resultSummary);

  /* eslint-disable no-param-reassign */
  resultSummary.newImages.forEach((img) => {
    img.current = reviewImageUrl(img, 'current.png');
  });
  resultSummary.diffImages.forEach((img) => {
    img.current = reviewImageUrl(img, 'current.png');
    img.previous = reviewImageUrl(img, 'previous.png');
  });
  /* eslint-enable no-param-reassign */

  response.render('review', prepareViewData({
    pageTitle: title,
    appProps: Object.assign({}, resultSummary, {
      pageTitle: title,
    }),
  }));
});

app.get('/review-demo', (request, response) => {
  const title = pageTitle(reviewDemoData);
  response.render('review', prepareViewData({
    pageTitle: title,
    appProps: Object.assign({}, reviewDemoData, {
      pageTitle: title,
      generatedAt: Date.now(),
    }),
  }));
});

module.exports = {
  start() {
    return new Promise((resolve) => {
      app.listen(config.port, () => {
        console.log(`Happo listening on ${config.port}`);
        resolve();
      });
    });
  },
};