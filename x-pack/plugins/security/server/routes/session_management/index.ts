/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '..';
import { defineSessionExtendRoutes } from './extend';
import { defineSessionInfoRoutes } from './info';
import { defineInvalidateSessionsRoutes } from './invalidate';

export function defineSessionManagementRoutes(params: RouteDefinitionParams) {
  defineSessionInfoRoutes(params);
  defineSessionExtendRoutes(params);

  // In the serverless environment, sessions will remain valid until a user logs out of cloud
  // eliminating the need for an invalidate session HTTP API
  if (params.buildFlavor !== 'serverless') {
    defineInvalidateSessionsRoutes(params);
  }
}
