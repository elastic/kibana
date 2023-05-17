/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const cypress = require('cypress');
const process = require('process');

console.log('subprocess.ts', process.argv);

cypress.run({
  spec: process.env.CYPRESS_SPEC,
  browser: 'chrome',
  headed: false,
  configFile: process.env.CYPRESS_CONFIG_FILE,
  config: {
    numTestsKeptInMemory: 0,
    env: {
      FORCE_COLOR: process.env.FORCE_COLOR,
      CYPRESS_BASE_URL: process.env.CYPRESS_BASE_URL,
      CYPRESS_ELASTICSEARCH_URL: process.env.CYPRESS_ELASTICSEARCH_URL,
      CYPRESS_ELASTICSEARCH_USERNAME: process.env.CYPRESS_ELASTICSEARCH_USERNAME,
      CYPRESS_ELASTICSEARCH_PASSWORD: process.env.CYPRESS_ELASTICSEARCH_PASSWORD,
      baseUrl: process.env.baseUrl,
      BASE_URL: process.env.BASE_URL,
      ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL,
      ELASTICSEARCH_USERNAME: process.env.ELASTICSEARCH_USERNAME,
      ELASTICSEARCH_PASSWORD: process.env.ELASTICSEARCH_PASSWORD,
    },
  },
});

// (async () => {
// setTimeout(() => {
//   console.log('processID in child2 ', process.pid);
//   // process.send('test');
// }, 1000);

// cypress.open();

// process.on('message', (msg) => {
//   console.log('The message between IPC channel, in child2.js:\n', msg);

//   return cypress.run(msg).finally((data) => {
//     console.log('data', data);
//     process.send(data);
//   });
// });

// new Promise((resolve) => {
//   setTimeout(() => {
//     resolve({ dupa: true });
//   }, 1000);
// }).then((data) => {
//   console.log('data', data);
//   process.send(data);
// });
// return cypress.run().then(() => {{}
// await cypress.run().then(() => {
//   process.send({ feedback: 'hello world' });
// });
// })();
