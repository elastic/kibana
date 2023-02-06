/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCypressConfig } from '@kbn/cypress-config';

export default defineCypressConfig({
  defaultCommandTimeout: 60000,
  requestTimeout: 60000,
  responseTimeout: 60000,
  execTimeout: 120000,
  pageLoadTimeout: 120000,

  retries: {
    runMode: 2,
  },

  screenshotsFolder: '../../../target/kibana-fleet/cypress/screenshots',
  trashAssetsBeforeRuns: false,
  video: false,
  videosFolder: '../../../target/kibana-fleet/cypress/videos',
  viewportHeight: 900,
  viewportWidth: 1440,
  screenshotOnRunFailure: true,

  env: {
    protocol: 'http',
    hostname: 'localhost',
    configport: '5601',
  },

  e2e: {
    baseUrl: 'http://localhost:5601',
    setupNodeEvents(on, config) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @kbn/imports/no_boundary_crossing
      return require('./cypress/plugins')(on, config);
    },
  },
});
