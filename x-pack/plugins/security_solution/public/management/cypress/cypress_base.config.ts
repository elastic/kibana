/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getCypressBaseConfig = () => ({
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
    'cypress-react-selector': {
      root: '#security-solution-app',
    },
    KIBANA_URL: 'http://localhost:5601',
    ELASTICSEARCH_URL: 'http://localhost:9200',
    FLEET_SERVER_URL: 'https://localhost:8220',
    KIBANA_USERNAME: 'system_indices_superuser',
    KIBANA_PASSWORD: 'changeme',
    ELASTICSEARCH_USERNAME: 'system_indices_superuser',
    ELASTICSEARCH_PASSWORD: 'changeme',

    // grep related configs
    grepFilterSpecs: true,
    grepOmitFiltered: true,
  },

  e2e: {
    // baseUrl: To override, set Env. variable `CYPRESS_BASE_URL`
    baseUrl: 'http://localhost:5601',

    supportFile: 'public/management/cypress/support/e2e.ts',
    experimentalRunAllSpecs: true,
  },
});
