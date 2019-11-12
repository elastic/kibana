/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { definePrivilegesRoutes } from './privileges';
import { defineRolesRoutes } from './roles';
import { RouteDefinitionParams } from '..';

export function defineAuthorizationRoutes(params: RouteDefinitionParams) {
  defineRolesRoutes(params);
  definePrivilegesRoutes(params);
}
