/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSessionExtendRoutes } from './extend';
import { defineSessionInfoRoutes } from './info';
import { defineInvalidateSessionsRoutes } from './invalidate';
import type { RouteDefinitionParams } from '..';

export function defineSessionManagementRoutes(params: RouteDefinitionParams) {
  defineSessionInfoRoutes(params);
  defineSessionExtendRoutes(params);

  // The invalidate session API was introduced to address situations where the session index
  // could grow rapidly - when session timeouts are disabled, or with anonymous access.
  // In the serverless environment, sessions timeouts are always be enabled, and there is no
  // anonymous access. This eliminates the need for an invalidate session HTTP API.
  if (params.buildFlavor !== 'serverless') {
    defineInvalidateSessionsRoutes(params);
  }
}
