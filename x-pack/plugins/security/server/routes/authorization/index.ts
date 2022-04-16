/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '..';
import { definePrivilegesRoutes } from './privileges';
import { resetSessionPageRoutes } from './reset_session_page';
import { defineRolesRoutes } from './roles';
import { defineShareSavedObjectPermissionRoutes } from './spaces';

export function defineAuthorizationRoutes(params: RouteDefinitionParams) {
  defineRolesRoutes(params);
  definePrivilegesRoutes(params);
  resetSessionPageRoutes(params);
  defineShareSavedObjectPermissionRoutes(params);
}
