/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCypressConfig } from '@kbn/cypress-config';
import { CY_BASE_CONFIG } from './cypress_base.config';
import { dataLoaders } from './support/data_loaders';

// eslint-disable-next-line import/no-default-export
export default defineCypressConfig({
  ...CY_BASE_CONFIG,

  env: {
    ...CY_BASE_CONFIG.env,

    IS_SERVERLESS: true,

    grepTags: '@serverless --@brokenInServerless',
  },

  e2e: {
    ...CY_BASE_CONFIG.e2e,

    specPattern: 'public/management/cypress/e2e/mocked_data/',

    setupNodeEvents: (on, config) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@cypress/grep/src/plugin')(config);

      return dataLoaders(on, config);
    },
  },
});
