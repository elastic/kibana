/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { defineRoleMappingFeatureCheckRoute } from './feature_check';
import { defineRoleMappingGetRoutes } from './get';
import { defineRoleMappingPostRoutes } from './post';
import { defineRoleMappingDeleteRoutes } from './delete';
import { RouteDefinitionParams } from '..';

export function defineRoleMappingRoutes(params: RouteDefinitionParams) {
  defineRoleMappingFeatureCheckRoute(params);
  defineRoleMappingGetRoutes(params);
  defineRoleMappingPostRoutes(params);
  defineRoleMappingDeleteRoutes(params);
}
