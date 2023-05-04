/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../../../types';

import { registerGetOneRoute, registerGetAllRoute } from './register_get_route';
import { registerDeleteRoute } from './register_delete_route';
import { registerPostOneApplyLatestMappings, registerPostOneRollover } from './register_post_route';

export function registerDataStreamRoutes(dependencies: RouteDependencies) {
  registerGetOneRoute(dependencies);
  registerPostOneApplyLatestMappings(dependencies);
  registerPostOneRollover(dependencies);
  registerGetAllRoute(dependencies);
  registerDeleteRoute(dependencies);
}
