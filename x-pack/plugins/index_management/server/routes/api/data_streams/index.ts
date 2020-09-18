/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDependencies } from '../../../types';

import { registerGetOneRoute, registerGetAllRoute } from './register_get_route';
import { registerDeleteRoute } from './register_delete_route';

export function registerDataStreamRoutes(dependencies: RouteDependencies) {
  registerGetOneRoute(dependencies);
  registerGetAllRoute(dependencies);
  registerDeleteRoute(dependencies);
}
