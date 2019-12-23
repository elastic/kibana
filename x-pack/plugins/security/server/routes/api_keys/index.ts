/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defineGetApiKeysRoutes } from './get';
import { defineCheckPrivilegesRoutes } from './privileges';
import { defineInvalidateApiKeysRoutes } from './invalidate';
import { RouteDefinitionParams } from '..';

export function defineApiKeysRoutes(params: RouteDefinitionParams) {
  defineGetApiKeysRoutes(params);
  defineCheckPrivilegesRoutes(params);
  defineInvalidateApiKeysRoutes(params);
}
