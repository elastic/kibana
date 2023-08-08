/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tag } from '../../tags';
import { checkOsqueryResponseActionsPermissions } from '../../tasks/response_actions';

describe(
  'App Features for Security Essentials PLI',
  {
    tags: [tag.SERVERLESS],
    env: {
      ftrConfig: { productTypes: [{ product_line: 'security', product_tier: 'essentials' }] },
    },
  },
  () => checkOsqueryResponseActionsPermissions(false)
);
