/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerDeleteRoute } from './register_delete_route';
import { registerExecuteRoute } from './register_execute_route';
import { registerLoadRoute } from './register_load_route';
import { registerSaveRoute } from './register_save_route';
import { registerHistoryRoute } from './register_history_route';
import { registerActivateRoute } from './register_activate_route';
import { registerDeactivateRoute } from './register_deactivate_route';
import { registerVisualizeRoute } from './register_visualize_route';
import { registerActionRoutes } from './action';
import { RouteDependencies } from '../../../types';

export function registerWatchRoutes(deps: RouteDependencies) {
  registerDeleteRoute(deps);
  registerExecuteRoute(deps);
  registerLoadRoute(deps);
  registerSaveRoute(deps);
  registerHistoryRoute(deps);
  registerActivateRoute(deps);
  registerDeactivateRoute(deps);
  registerActionRoutes(deps);
  registerVisualizeRoute(deps);
}
