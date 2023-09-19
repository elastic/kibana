/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCypressConfig } from '@kbn/cypress-config';
import { getCypressBaseConfig } from './cypress_base.config';

import { dataLoaders } from './support/data_loaders';

export default defineCypressConfig({
  ...getCypressBaseConfig(),

  env: {
    ...getCypressBaseConfig().env,

    grepTags: '@ess',
  },

  e2e: {
    ...getCypressBaseConfig().e2e,

    specPattern: 'public/management/cypress/e2e/mocked_data/',
    setupNodeEvents: (on, config) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@cypress/grep/src/plugin')(config);

      return dataLoaders(on, config);
    },
  },
});
