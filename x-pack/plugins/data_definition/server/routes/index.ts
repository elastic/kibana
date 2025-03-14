/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createServerRouteFactory } from '@kbn/server-route-repository';

import type { CustomRequestHandlerContext, KibanaRequest } from '@kbn/core/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server/types';
import type { Logger } from '@kbn/logging';
import type {
  DataDefinitionServerSetupDependencies,
  DataDefinitionServerStartDependencies,
} from '..';

export const createDataDefinitionServerRoute = createServerRouteFactory<
  DataDefinitionRouteHandlerResources,
  DataDefinitionRouteCreateOptions
>();

export type DataDefinitionRequestHandlerContext = CustomRequestHandlerContext<{
  licensing: Pick<LicensingApiRequestHandlerContext, 'license' | 'featureUsage'>;
}>;

export interface DataDefinitionRouteHandlerResources {
  request: KibanaRequest;
  context: DataDefinitionRequestHandlerContext;
  logger: Logger;
  plugins: {
    [key in keyof DataDefinitionServerSetupDependencies]: {
      setup: Required<DataDefinitionServerSetupDependencies>[key];
    };
  } & {
    [key in keyof DataDefinitionServerStartDependencies]: {
      start: () => Promise<Required<DataDefinitionServerStartDependencies>[key]>;
    };
  };
}

export interface DataDefinitionRouteCreateOptions {
  timeout?: {
    idleSocket?: number;
  };
  tags: Array<'access:dataDefinition'>;
}
