/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkOsqueryResponseActionsPermissions } from '../../tasks/response_actions';

describe(
  'App Features for Enpoint Complete PLI',
  {
    tags: ['@serverless'],
    env: {
      ftrConfig: {
        productTypes: [
          { product_line: 'endpoint', product_tier: 'complete' },
          { product_line: 'security', product_tier: 'complete' },
        ],
      },
    },
  },
  () => checkOsqueryResponseActionsPermissions(true)
);
