/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkOsqueryResponseActionsPermissions } from '../../tasks/response_actions';

describe(
  'App Features for Security Essentials PLI',
  {
    // accessing restricted / system indices directly does not work in serverless
    // also, the system_indices_superuser is not available in serverless, using it for login leads to:
    // CypressError: `cy.request()` failed on: https://localhost:5634/internal/security/login
    // The response we received from your web server was: > 401: Unauthorized
    tags: ['@serverless', '@brokenInServerless'],
    env: {
      ftrConfig: { productTypes: [{ product_line: 'security', product_tier: 'essentials' }] },
    },
  },
  () => checkOsqueryResponseActionsPermissions(false)
);
