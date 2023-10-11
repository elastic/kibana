/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRoutes } from './create/route';
import { queueRoutes } from './queue/route';

export function getGlobalHighCardinalityIndexerServerRouteRepository() {
  return {
    ...createRoutes,
    ...queueRoutes,
  };
}

export type ObservabilityAIAssistantServerRouteRepository = ReturnType<
  typeof getGlobalHighCardinalityIndexerServerRouteRepository
>;
