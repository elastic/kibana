/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRoutes } from './create/route';

export function getGlobalHighCardinalityIndexerServerRouteRepository() {
  return {
    ...createRoutes,
  };
}

export type ObservabilityAIAssistantServerRouteRepository = ReturnType<
  typeof getGlobalHighCardinalityIndexerServerRouteRepository
>;
