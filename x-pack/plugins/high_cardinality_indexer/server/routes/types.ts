/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomRequestHandlerContext, KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { RacApiRequestHandlerContext } from '@kbn/rule-registry-plugin/server';
import { JobRegistry } from '../jobs/job_registry';
import type {
  HighCardinalityIndexerPluginSetupDependencies,
  HighCardinalityIndexerPluginStartDependencies,
} from '../types';

export type HighCardinalityIndexerRequestHandlerContext = CustomRequestHandlerContext<{
  rac: RacApiRequestHandlerContext;
}>;

export interface HighCardinalityIndexerRouteHandlerResources {
  request: KibanaRequest;
  context: HighCardinalityIndexerRequestHandlerContext;
  logger: Logger;

  jobRegistry: JobRegistry;
  plugins: {
    [key in keyof HighCardinalityIndexerPluginSetupDependencies]: {
      setup: Required<HighCardinalityIndexerPluginSetupDependencies>[key];
    };
  } & {
    [key in keyof HighCardinalityIndexerPluginStartDependencies]: {
      start: () => Promise<Required<HighCardinalityIndexerPluginStartDependencies>[key]>;
    };
  };
}

export interface HighCardinalityIndexerRouteCreateOptions {
  options: {
    timeout?: {
      idleSocket?: number;
    };
  };
}
