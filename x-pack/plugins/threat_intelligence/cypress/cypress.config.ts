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
  execTimeout: 120000,
  pageLoadTimeout: 120000,
  retries: {
    runMode: 2,
  },
  screenshotsFolder: '../../../target/kibana-threat-intelligence/cypress/screenshots',
  trashAssetsBeforeRuns: false,
  video: false,
  videosFolder: '../../../target/kibana-threat-intelligence/cypress/videos',
  viewportHeight: 946,
  viewportWidth: 1680,
  env: {
    protocol: 'http',
    hostname: 'localhost',
    configport: '5601',
  },
  e2e: {
    baseUrl: 'http://localhost:5601',
    setupNodeEvents(on, config) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('./plugins')(on, config);
    },
  },
});
