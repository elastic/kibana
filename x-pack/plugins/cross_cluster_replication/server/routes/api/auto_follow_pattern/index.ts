/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDependencies } from '../../../types';
import { registerCreateRoute } from './register_create_route';
import { registerDeleteRoute } from './register_delete_route';
import { registerFetchRoute } from './register_fetch_route';
import { registerGetRoute } from './register_get_route';
import { registerPauseRoute } from './register_pause_route';
import { registerResumeRoute } from './register_resume_route';
import { registerUpdateRoute } from './register_update_route';

export function registerAutoFollowPatternRoutes(dependencies: RouteDependencies) {
  registerCreateRoute(dependencies);
  registerDeleteRoute(dependencies);
  registerFetchRoute(dependencies);
  registerGetRoute(dependencies);
  registerPauseRoute(dependencies);
  registerResumeRoute(dependencies);
  registerUpdateRoute(dependencies);
}
