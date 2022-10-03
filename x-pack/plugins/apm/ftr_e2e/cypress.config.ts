/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineConfig } from 'cypress';
import { some } from 'lodash';
import del from 'del';
import { plugin } from './cypress/plugins';

module.exports = defineConfig({
  projectId: 'omwh6f',
  fileServerFolder: './cypress',
  fixturesFolder: './cypress/fixtures',
  screenshotsFolder: './cypress/screenshots',
  videosFolder: './cypress/videos',
  requestTimeout: 10000,
  responseTimeout: 40000,
  defaultCommandTimeout: 30000,
  execTimeout: 120000,
  pageLoadTimeout: 120000,
  viewportHeight: 900,
  viewportWidth: 1440,
  video: true,
  videoUploadOnPasses: false,
  screenshotOnRunFailure: true,
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      plugin(on, config);
      on('after:spec', (spec, results) => {
        // Delete videos that have no failures or retries
        if (results && results.video) {
          const failures = some(results.tests, (test) => {
            return some(test.attempts, { state: 'failed' });
          });
          if (!failures) {
            return del(results.video);
          }
        }
      });
    },
    baseUrl: 'http://localhost:5601',
    supportFile: './cypress/support/e2e.ts',
    specPattern: './cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    experimentalSessionAndOrigin: false,
  },
});
