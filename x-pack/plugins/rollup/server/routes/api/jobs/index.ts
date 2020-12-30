/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDependencies } from '../../../types';
import { registerCreateRoute } from './register_create_route';
import { registerDeleteRoute } from './register_delete_route';
import { registerGetRoute } from './register_get_route';
import { registerStartRoute } from './register_start_route';
import { registerStopRoute } from './register_stop_route';

export function registerJobsRoutes(dependencies: RouteDependencies) {
  registerCreateRoute(dependencies);
  registerDeleteRoute(dependencies);
  registerGetRoute(dependencies);
  registerStartRoute(dependencies);
  registerStopRoute(dependencies);
}
