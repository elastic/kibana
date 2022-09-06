/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { defineConfig } = require('cypress');

module.exports = defineConfig({
  retries: {
    runMode: 2,
  },
  env: {
    username: 'elastic',
    password: 'changeme',
  },
  fixturesFolder: false,
  screenshotsFolder: '../../../target/cypress/screenshots',
  videosFolder: '../../../target/cypress/videos',
  defaultCommandTimeout: 120000,
  execTimeout: 120000,
  pageLoadTimeout: 180000,
  viewportWidth: 1600,
  viewportHeight: 1200,
  video: false,
  e2e: {
    setupNodeEvents(on, config) {},
    supportFile: false,
    baseUrl: 'http://localhost:5601',
  },
});
