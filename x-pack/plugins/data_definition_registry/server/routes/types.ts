/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from 'elastic-apm-node';
import type { KibanaRequest } from '@kbn/core/server';
import type { DataDefinitionRegistryRequestHandlerContext } from '.';
import type { DataDefinitionRegistry } from '../data_definition_registry/types';
import type {
  DataDefinitionRegistryServerSetupDependencies,
  DataDefinitionRegistryServerStartDependencies,
} from '../plugin';

export interface DataDefinitionRegistryRouteHandlerResources {
  request: KibanaRequest;
  context: DataDefinitionRegistryRequestHandlerContext;
  logger: Logger;
  registry: DataDefinitionRegistry;
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
  timeout?: {
    idleSocket?: number;
  };
  tags: Array<'access:dataDefinitionRegistry'>;
}
