/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDefinitionParams } from '../..';
import { defineGetRolesRoutes } from './get';
import { defineGetAllRolesRoutes } from './get_all';
import { defineDeleteRolesRoutes } from './delete';
import { definePutRolesRoutes } from './put';

export function defineRolesRoutes(params: RouteDefinitionParams) {
  defineGetRolesRoutes(params);
  defineGetAllRolesRoutes(params);
  defineDeleteRolesRoutes(params);
  definePutRolesRoutes(params);
}
