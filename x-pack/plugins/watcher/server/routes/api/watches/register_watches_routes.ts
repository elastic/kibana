/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../../../types';
import { registerDeleteRoute } from './register_delete_route';
import { registerListRoute } from './register_list_route';

export function registerWatchesRoutes(deps: RouteDependencies) {
  registerListRoute(deps);
  registerDeleteRoute(deps);
}
