/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defineSessionExtendRoutes } from './extend';
import { defineSessionInfoRoutes } from './info';
import { RouteDefinitionParams } from '..';

export function defineSessionManagementRoutes(params: RouteDefinitionParams) {
  defineSessionInfoRoutes(params);
  defineSessionExtendRoutes(params);
}
