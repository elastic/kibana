/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup } from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';
import { registerRoutes } from '@kbn/server-route-repository';
import { getGlobalHighCardinalityIndexerServerRouteRepository } from './get_global_high_cardinality_indexer_route_repository';
import type { HighCardinalityIndexerRouteHandlerResources } from './types';

export function registerServerRoutes({
  core,
  logger,
  dependencies,
}: {
  core: CoreSetup;
  logger: Logger;
  dependencies: Omit<HighCardinalityIndexerRouteHandlerResources, 'request' | 'context' | 'params'>;
}) {
  registerRoutes({
    core,
    logger,
    repository: getGlobalHighCardinalityIndexerServerRouteRepository(),
    dependencies,
  });
}
