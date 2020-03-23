/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defineGetFieldsRoutes } from './get_fields';
import { RouteDefinitionParams } from '..';

export function defineIndicesRoutes(params: RouteDefinitionParams) {
  defineGetFieldsRoutes(params);
}
