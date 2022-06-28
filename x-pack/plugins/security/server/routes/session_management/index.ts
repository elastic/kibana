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
  defineInvalidateSessionsRoutes(params);
}
