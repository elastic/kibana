/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCreateApiKeyRoutes } from './create';
import { defineEnabledApiKeysRoutes } from './enabled';
import { defineHasApiKeysRoutes } from './has_active';
import { defineInvalidateApiKeysRoutes } from './invalidate';
import { defineQueryApiKeysAndAggregationsRoute } from './query';
import { defineUpdateApiKeyRoutes } from './update';
import type { RouteDefinitionParams } from '..';

export type {
  UpdateAPIKeyParams,
  UpdateAPIKeyResult,
  UpdateRestAPIKeyParams,
  UpdateCrossClusterAPIKeyParams,
  UpdateRestAPIKeyWithKibanaPrivilegesParams,
} from './update';

export function defineApiKeysRoutes(params: RouteDefinitionParams) {
  defineEnabledApiKeysRoutes(params);
  defineHasApiKeysRoutes(params);
  defineCreateApiKeyRoutes(params);
  defineUpdateApiKeyRoutes(params);
  defineInvalidateApiKeysRoutes(params);
  defineQueryApiKeysAndAggregationsRoute(params);
}
