/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerListRoute } from './register_list_route';
import { registerDeleteRoute } from './register_delete_route';
import { RouteDependencies } from '../../../types';

export function registerWatchesRoutes(deps: RouteDependencies) {
  registerListRoute(deps);
  registerDeleteRoute(deps);
}
