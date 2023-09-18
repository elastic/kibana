/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineBulkGetUserProfilesRoute } from './bulk_get';
import { defineGetCurrentUserProfileRoute } from './get_current';
import { defineUpdateUserProfileDataRoute } from './update';
import type { RouteDefinitionParams } from '..';

export function defineUserProfileRoutes(params: RouteDefinitionParams) {
  defineUpdateUserProfileDataRoute(params);
  defineGetCurrentUserProfileRoute(params);
  defineBulkGetUserProfilesRoute(params);
}
