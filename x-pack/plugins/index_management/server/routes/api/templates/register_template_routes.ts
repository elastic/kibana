/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../../../types';

import { registerCreateRoute } from './register_create_route';
import { registerDeleteRoute } from './register_delete_route';
import { registerGetAllRoute, registerGetOneRoute } from './register_get_routes';
import { registerSimulateRoute } from './register_simulate_route';
import { registerUpdateRoute } from './register_update_route';

export function registerTemplateRoutes(dependencies: RouteDependencies) {
  registerGetAllRoute(dependencies);
  registerGetOneRoute(dependencies);
  registerDeleteRoute(dependencies);
  registerCreateRoute(dependencies);
  registerUpdateRoute(dependencies);
  registerSimulateRoute(dependencies);
}
