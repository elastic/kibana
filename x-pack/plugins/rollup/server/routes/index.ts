/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDependencies } from '../types';

import { registerIndicesRoutes } from './api/indices';
import { registerJobsRoutes } from './api/jobs';
import { registerSearchRoutes } from './api/search';

export function registerApiRoutes(dependencies: RouteDependencies) {
  registerIndicesRoutes(dependencies);
  registerJobsRoutes(dependencies);
  registerSearchRoutes(dependencies);
}
