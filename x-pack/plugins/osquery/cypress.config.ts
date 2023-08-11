/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCypressConfig } from '@kbn/cypress-config';

// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { setupUserDataLoader } from './cypress/support/setup_data_loader_tasks';

export default defineCypressConfig({
  defaultCommandTimeout: 60000,
  execTimeout: 120000,
  pageLoadTimeout: 12000,

  retries: {
    runMode: 1,
    openMode: 0,
  },

  screenshotsFolder: '../../../target/kibana-osquery/cypress/screenshots',
  trashAssetsBeforeRuns: false,
  video: false,
  videosFolder: '../../../target/kibana-osquery/cypress/videos',
  viewportHeight: 900,
  viewportWidth: 1440,
  experimentalStudio: true,

  env: {
    'cypress-react-selector': {
      root: '#osquery-app',
    },
    grepFilterSpecs: true,
    grepTags: '@ess',
  },

  e2e: {
    specPattern: './cypress/e2e/**/*.cy.ts',
    baseUrl: 'http://localhost:5601',
    experimentalRunAllSpecs: true,
    experimentalMemoryManagement: true,
    numTestsKeptInMemory: 10,
    setupNodeEvents(on, config) {
      setupUserDataLoader(on, config);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@cypress/grep/src/plugin')(config);

      return config;
    },
  },
});
