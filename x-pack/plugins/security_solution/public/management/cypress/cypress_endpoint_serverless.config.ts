/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCypressConfig } from '@kbn/cypress-config';
import { dataLoaders } from './support/data_loaders';
import { responseActionTasks } from './support/response_actions';

// eslint-disable-next-line import/no-default-export
export default defineCypressConfig({
  reporter: '../../../../node_modules/cypress-multi-reporters',
  reporterOptions: {
    configFile: './public/management/reporter_config.json',
  },

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
    KIBANA_URL: 'http://localhost:5601',
    ELASTICSEARCH_URL: 'http://localhost:9200',
    FLEET_SERVER_URL: 'https://localhost:8220',
    // Username/password used for both elastic and kibana
    KIBANA_USERNAME: 'elastic',
    KIBANA_PASSWORD: 'changeme',
    ELASTICSEARCH_USERNAME: 'system_indices_superuser',
    ELASTICSEARCH_PASSWORD: 'changeme',

    grepFilterSpecs: true,
    grepOmitFiltered: true,
    grepTags: '@serverless --@brokenInServerless',

    'cypress-react-selector': {
      root: '#security-solution-app',
    },
  },

  e2e: {
    experimentalMemoryManagement: true,
    experimentalInteractiveRunEvents: true,
    // baseUrl: To override, set Env. variable `CYPRESS_BASE_URL`
    baseUrl: 'http://localhost:5620',
    supportFile: 'public/management/cypress/support/e2e.ts',
    specPattern: 'public/management/cypress/e2e/endpoint/*.cy.{js,jsx,ts,tsx}',
    experimentalRunAllSpecs: true,
    setupNodeEvents: (on, config) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@cypress/grep/src/plugin')(config);

      dataLoaders(on, config);

      // skip dataLoadersForRealEndpoints()
      // https://github.com/elastic/security-team/issues/7467
      // Data loaders specific to "real" Endpoint testing
      // dataLoadersForRealEndpoints(on, config);

      responseActionTasks(on, config);
    },
  },
});
