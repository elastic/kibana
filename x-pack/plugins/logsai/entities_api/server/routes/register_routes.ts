/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { registerRoutes } from '@kbn/server-route-repository';
import { getGlobalEntitiesAPIServerRouteRepository } from './get_global_entities_api_route_repository';
import type { EntitiesAPIRouteHandlerResources } from './types';

export function registerServerRoutes({
  core,
  logger,
  dependencies,
}: {
  core: CoreSetup;
  logger: Logger;
  dependencies: Omit<EntitiesAPIRouteHandlerResources, 'request' | 'context' | 'logger' | 'params'>;
}) {
  registerRoutes({
    core,
    logger,
    repository: getGlobalEntitiesAPIServerRouteRepository(),
    dependencies,
  });
}
