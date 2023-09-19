/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCypressConfig } from '@kbn/cypress-config';
import { CY_BASE_CONFIG } from './cypress_base.config';

import { dataLoaders, dataLoadersForRealEndpoints } from './support/data_loaders';

import { responseActionTasks } from './support/response_actions';

// eslint-disable-next-line import/no-default-export
export default defineCypressConfig({
  ...CY_BASE_CONFIG,

  env: {
    ...CY_BASE_CONFIG.env,

    'cypress-react-selector': {
      root: '#security-solution-app',
    },

    grepTags: '@ess',
  },

  e2e: {
    ...CY_BASE_CONFIG.e2e,

    experimentalMemoryManagement: true,
    experimentalInteractiveRunEvents: true,
    specPattern: 'public/management/cypress/e2e/endpoint/*.cy.{js,jsx,ts,tsx}',
    setupNodeEvents: (on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) => {
      dataLoaders(on, config);
      // Data loaders specific to "real" Endpoint testing
      dataLoadersForRealEndpoints(on, config);
      responseActionTasks(on, config);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@cypress/grep/src/plugin')(config);

      return config;
    },
  },
});
