/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entitiesRoutes } from './entities/route';
import { esqlRoutes } from './esql/route';
import { typesRoutes } from './types/route';

export function getGlobalEntitiesAPIServerRouteRepository() {
  return {
    ...entitiesRoutes,
    ...typesRoutes,
    ...esqlRoutes,
  };
}

export type EntitiesAPIServerRouteRepository = ReturnType<
  typeof getGlobalEntitiesAPIServerRouteRepository
>;
