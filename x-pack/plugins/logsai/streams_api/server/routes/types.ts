/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomRequestHandlerContext, KibanaRequest } from '@kbn/core/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server/types';
import type { Logger } from '@kbn/logging';
import type { StreamsAPISetupDependencies, StreamsAPIStartDependencies } from '../types';

export type StreamsAPIRequestHandlerContext = CustomRequestHandlerContext<{
  licensing: Pick<LicensingApiRequestHandlerContext, 'license' | 'featureUsage'>;
}>;

export interface StreamsAPIRouteHandlerResources {
  request: KibanaRequest;
  context: StreamsAPIRequestHandlerContext;
  logger: Logger;
  plugins: {
    [key in keyof StreamsAPISetupDependencies]: {
      setup: Required<StreamsAPISetupDependencies>[key];
    };
  } & {
    [key in keyof StreamsAPIStartDependencies]: {
      start: () => Promise<Required<StreamsAPIStartDependencies>[key]>;
    };
  };
}

export interface StreamsAPIRouteCreateOptions {
  options: {
    timeout?: {
      idleSocket?: number;
    };
    tags: Array<'access:entities'>;
  };
}
