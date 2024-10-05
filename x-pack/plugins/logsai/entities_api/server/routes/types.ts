/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomRequestHandlerContext, KibanaRequest } from '@kbn/core/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server/types';
import type { Logger } from '@kbn/logging';
import type { EntitiesAPISetupDependencies, EntitiesAPIStartDependencies } from '../types';

export type EntitiesAPIRequestHandlerContext = CustomRequestHandlerContext<{
  licensing: Pick<LicensingApiRequestHandlerContext, 'license' | 'featureUsage'>;
}>;

export interface EntitiesAPIRouteHandlerResources {
  request: KibanaRequest;
  context: EntitiesAPIRequestHandlerContext;
  logger: Logger;
  plugins: {
    [key in keyof EntitiesAPISetupDependencies]: {
      setup: Required<EntitiesAPISetupDependencies>[key];
    };
  } & {
    [key in keyof EntitiesAPIStartDependencies]: {
      start: () => Promise<Required<EntitiesAPIStartDependencies>[key]>;
    };
  };
}

export interface EntitiesAPIRouteCreateOptions {
  options: {
    timeout?: {
      idleSocket?: number;
    };
    tags: Array<'access:entities'>;
  };
}
