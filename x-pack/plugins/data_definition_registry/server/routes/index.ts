/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { registerRoutes } from '@kbn/server-route-repository';

import type { CoreSetup, CustomRequestHandlerContext } from '@kbn/core/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server/types';
import type { Logger } from '@kbn/logging';
import { definitionsRoutes } from './definitions/route';
import { DataDefinitionRegistryRouteHandlerResources } from './types';

export function getGlobalDataDefinitionRegistryServerRouteRepository() {
  return {
    ...definitionsRoutes,
  };
}

export type DataDefinitionRegistryServerRouteRepository = ReturnType<
  typeof getGlobalDataDefinitionRegistryServerRouteRepository
>;

export type DataDefinitionRegistryRequestHandlerContext = CustomRequestHandlerContext<{
  licensing: Pick<LicensingApiRequestHandlerContext, 'license' | 'featureUsage'>;
}>;

export function registerServerRoutes({
  core,
  logger,
  dependencies,
}: {
  core: CoreSetup;
  logger: Logger;
  dependencies: Omit<
    DataDefinitionRegistryRouteHandlerResources,
    'request' | 'context' | 'logger' | 'params'
  >;
}) {
  registerRoutes({
    core,
    logger,
    repository: getGlobalDataDefinitionRegistryServerRouteRepository(),
    dependencies,
  });
}
