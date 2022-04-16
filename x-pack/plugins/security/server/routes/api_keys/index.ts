/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '..';
import { defineCreateApiKeyRoutes } from './create';
import { defineEnabledApiKeysRoutes } from './enabled';
import { defineGetApiKeysRoutes } from './get';
import { defineInvalidateApiKeysRoutes } from './invalidate';
import { defineCheckPrivilegesRoutes } from './privileges';

export function defineApiKeysRoutes(params: RouteDefinitionParams) {
  defineEnabledApiKeysRoutes(params);
  defineGetApiKeysRoutes(params);
  defineCreateApiKeyRoutes(params);
  defineCheckPrivilegesRoutes(params);
  defineInvalidateApiKeysRoutes(params);
}
