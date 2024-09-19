/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entitiesRoutes } from './entities/route';
import { datasetsRoutes } from './datasets/route';
import { esqlRoutes } from './esql/route';
import { metricsRoutes } from './metrics/route';

export function getGlobalInventoryServerRouteRepository() {
  return {
    ...entitiesRoutes,
    ...datasetsRoutes,
    ...esqlRoutes,
    ...metricsRoutes,
  };
}

export type InventoryServerRouteRepository = ReturnType<
  typeof getGlobalInventoryServerRouteRepository
>;
