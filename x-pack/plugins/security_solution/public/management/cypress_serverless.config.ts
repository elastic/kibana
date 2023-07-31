/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCypressConfig } from '@kbn/cypress-config';

// eslint-disable-next-line import/no-default-export
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
    grepTags: '@serverless',
    grepFilterSpecs: true,
    KIBANA_URL: 'http://localhost:5620',
    ELASTICSEARCH_URL: 'http://localhost:9200',
    FLEET_SERVER_URL: 'https://localhost:8220',
    // Username/password used for both elastic and kibana
    ELASTICSEARCH_USERNAME: 'elastic',
    ELASTICSEARCH_PASSWORD: 'changeme',
  },

  e2e: {
    // baseUrl: To override, set Env. variable `CYPRESS_BASE_URL`
    baseUrl: 'http://localhost:5620',
    supportFile: 'public/management/cypress/support/e2e.ts',
    specPattern: 'public/management/cypress/e2e/mocked_data/',
    experimentalRunAllSpecs: true,
    experimentalMemoryManagement: true,
    setupNodeEvents: (on, config) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, import/no-extraneous-dependencies
      require('@cypress/grep/src/plugin')(config);

      // todo: dataLoaders fail on serverless env, needs to be adapted to be able to use e.g. `indexEndpointHosts()`
      // return dataLoaders(on, config);

      return config;
    },
  },
});
