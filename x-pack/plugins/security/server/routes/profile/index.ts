/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '../index';
import { defineGetProfileRoute } from './get';
import { defineUpdateProfileDataRoute } from './update';

export function defineProfileRoutes(params: RouteDefinitionParams) {
  defineUpdateProfileDataRoute(params);
  defineGetProfileRoute(params);
}
