/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomRequestHandlerContext, KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { RacApiRequestHandlerContext } from '@kbn/rule-registry-plugin/server';
import type { ObservabilityAIAssistantService } from '../service';
import type {
  ObservabilityAIAssistantPluginSetupDependencies,
  ObservabilityAIAssistantPluginStartDependencies,
} from '../types';

export type ObservabilityAIAssistantRequestHandlerContext = CustomRequestHandlerContext<{
  rac: RacApiRequestHandlerContext;
}>;

export interface ObservabilityAIAssistantRouteHandlerResources {
  request: KibanaRequest;
  context: ObservabilityAIAssistantRequestHandlerContext;
  logger: Logger;
  service: ObservabilityAIAssistantService;
  plugins: {
    [key in keyof ObservabilityAIAssistantPluginSetupDependencies]: {
      setup: Required<ObservabilityAIAssistantPluginSetupDependencies>[key];
    };
  } & {
    [key in keyof ObservabilityAIAssistantPluginStartDependencies]: {
      start: () => Promise<Required<ObservabilityAIAssistantPluginStartDependencies>[key]>;
    };
  };
}

export interface ObservabilityAIAssistantRouteCreateOptions {
  options: {
    timeout?: {
      idleSocket?: number;
    };
    tags: Array<'access:ai_assistant'>;
  };
}
