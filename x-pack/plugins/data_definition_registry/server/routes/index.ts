/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createServerRouteFactory, registerRoutes } from '@kbn/server-route-repository';

import type { CoreSetup, CustomRequestHandlerContext, KibanaRequest } from '@kbn/core/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server/types';
import type { Logger } from '@kbn/logging';
import {
  DataDefinitionRegistryServerSetupDependencies,
  DataDefinitionRegistryServerStartDependencies,
} from '../plugin';

export function getGlobalDataDefinitionRegistryServerRouteRepository() {
  return {};
}

export type DataDefinitionRegistryServerRouteRepository = ReturnType<
  typeof getGlobalDataDefinitionRegistryServerRouteRepository
>;

export type DataDefinitionRegistryRequestHandlerContext = CustomRequestHandlerContext<{
  licensing: Pick<LicensingApiRequestHandlerContext, 'license' | 'featureUsage'>;
}>;

export interface DataDefinitionRegistryRouteHandlerResources {
  request: KibanaRequest;
  context: DataDefinitionRegistryRequestHandlerContext;
  logger: Logger;
  plugins: {
    [key in keyof DataDefinitionRegistryServerSetupDependencies]: {
      setup: Required<DataDefinitionRegistryServerSetupDependencies>[key];
    };
  } & {
    [key in keyof DataDefinitionRegistryServerStartDependencies]: {
      start: () => Promise<Required<DataDefinitionRegistryServerStartDependencies>[key]>;
    };
  };
}

export interface DataDefinitionRegistryRouteCreateOptions {
  options: {
    timeout?: {
      idleSocket?: number;
    };
    tags: Array<'access:dataDefinitionRegistry'>;
  };
}

export const createDataDefinitionRegistryServerRoute = createServerRouteFactory<
  DataDefinitionRegistryRouteHandlerResources,
  DataDefinitionRegistryRouteCreateOptions
>();

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
