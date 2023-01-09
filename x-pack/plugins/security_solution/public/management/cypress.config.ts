/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCypressConfig } from '@kbn/cypress-config';

export default defineCypressConfig({
  defaultCommandTimeout: 60000,
  execTimeout: 120000,
  pageLoadTimeout: 12000,

  retries: {
    runMode: 1,
    openMode: 0,
  },

  screenshotsFolder:
    '../../../target/kibana-security-solution/public/management/cypress/screenshots',
  trashAssetsBeforeRuns: false,
  video: false,
  viewportHeight: 900,
  viewportWidth: 1440,
  experimentalStudio: true,

  env: {
    'cypress-react-selector': {
      root: '#security-solution-app',
    },
  },

  e2e: {
    baseUrl: 'http://localhost:5620',
    supportFile: 'public/management/cypress/support/e2e.ts',
    specPattern: 'public/management/cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    experimentalRunAllSpecs: true,
  },
});
