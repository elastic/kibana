/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { enablementRoutes } from './enablement';
import { entitiesRoutes } from './entities';

export const entityManagerRouteRepository = {
  ...enablementRoutes,
  ...entitiesRoutes,
};

export type EntityManagerRouteRepository = typeof entityManagerRouteRepository;
