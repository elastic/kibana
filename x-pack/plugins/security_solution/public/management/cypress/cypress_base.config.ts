/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import registerDataSession from 'cypress-data-session/src/plugin';
import { dataLoaders, dataLoadersForRealEndpoints } from './support/data_loaders';
import { responseActionTasks } from './support/response_actions';

export const getCypressBaseConfig = (
  overrides: Cypress.ConfigOptions = {}
): Cypress.ConfigOptions => {
  return merge(
    {
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
        specPattern: 'public/management/cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
        experimentalRunAllSpecs: true,
        experimentalMemoryManagement: true,
        experimentalInteractiveRunEvents: true,
        setupNodeEvents: (on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) => {
          registerDataSession(on, config);
          dataLoaders(on, config);
          // Data loaders specific to "real" Endpoint testing
          dataLoadersForRealEndpoints(on, config);

          responseActionTasks(on, config);

          // eslint-disable-next-line @typescript-eslint/no-var-requires
          require('@cypress/grep/src/plugin')(config);

          return config;
        },
      },
    },
    overrides
  );
};
