/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Logger } from '@kbn/core/server';
import { registerRoutes } from '@kbn/server-route-repository';
import { DataDefinitionRouteHandlerResources } from '.';

export function getGlobalDataDefinitionServerRouteRepository() {
  return {};
}

export type DataDefinitionServerRouteRepository = ReturnType<
  typeof getGlobalDataDefinitionServerRouteRepository
>;

export function registerServerRoutes({
  core,
  logger,
  dependencies,
}: {
  core: CoreSetup;
  logger: Logger;
  dependencies: Omit<
    DataDefinitionRouteHandlerResources,
    'request' | 'context' | 'logger' | 'params'
  >;
}) {
  registerRoutes({
    core,
    logger,
    repository: getGlobalDataDefinitionServerRouteRepository(),
    dependencies,
  });
}
