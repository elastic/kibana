/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDefinitionParams } from '../index';
import { defineGetUserRoutes } from './get';
import { defineGetAllUsersRoutes } from './get_all';
import { defineCreateOrUpdateUserRoutes } from './create_or_update';
import { defineDeleteUserRoutes } from './delete';
import { defineChangeUserPasswordRoutes } from './change_password';

export function defineUsersRoutes(params: RouteDefinitionParams) {
  defineGetUserRoutes(params);
  defineGetAllUsersRoutes(params);
  defineCreateOrUpdateUserRoutes(params);
  defineDeleteUserRoutes(params);
  defineChangeUserPasswordRoutes(params);
}
