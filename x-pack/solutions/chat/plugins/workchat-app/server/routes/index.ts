/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDependencies } from './types';
import { registerDataSourcesRoutes } from './data_sources';
import { registerIndicesRoutes } from './indices';

export const registerRoutes = (dependencies: RouteDependencies) => {
  registerDataSourcesRoutes(dependencies);
  registerIndicesRoutes(dependencies);
};
