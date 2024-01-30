/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkOsqueryResponseActionsPermissions } from '../../tasks/response_actions';

// FLAKY: https://github.com/elastic/kibana/issues/174567
describe.skip(
  'App Features for Endpoint Essentials PLI',
  {
    tags: ['@serverless'],
    env: {
      ftrConfig: {
        productTypes: [
          { product_line: 'security', product_tier: 'essentials' },
          { product_line: 'endpoint', product_tier: 'essentials' },
        ],
      },
    },
  },
  () => checkOsqueryResponseActionsPermissions(false)
);
