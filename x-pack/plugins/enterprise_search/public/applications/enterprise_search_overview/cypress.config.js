/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'cypress';

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  defaultCommandTimeout: 120000,
  e2e: {
    baseUrl: 'http://localhost:5601',
    // eslint-disable-next-line no-unused-vars
    setupNodeEvents(on, config) {},
    supportFile: false,
  },
  env: {
    password: 'changeme',
    username: 'elastic',
  },
  execTimeout: 120000,
  fixturesFolder: false,
  pageLoadTimeout: 180000,
  retries: {
    runMode: 2,
  },
  screenshotsFolder: '../../../target/cypress/screenshots',
  video: false,
  videosFolder: '../../../target/cypress/videos',
  viewportHeight: 1200,
  viewportWidth: 1600,
});
