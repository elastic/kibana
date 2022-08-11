/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '..';
import { defineChangeUserPasswordRoutes } from './change_password';
import { defineCreateOrUpdateUserRoutes } from './create_or_update';
import { defineDeleteUserRoutes } from './delete';
import { defineDisableUserRoutes } from './disable';
import { defineEnableUserRoutes } from './enable';
import { defineGetUserRoutes } from './get';
import { defineGetAllUsersRoutes } from './get_all';

export function defineUsersRoutes(params: RouteDefinitionParams) {
  defineGetUserRoutes(params);
  defineGetAllUsersRoutes(params);
  defineCreateOrUpdateUserRoutes(params);
  defineDeleteUserRoutes(params);
  defineDisableUserRoutes(params);
  defineEnableUserRoutes(params);
  defineChangeUserPasswordRoutes(params);
}
