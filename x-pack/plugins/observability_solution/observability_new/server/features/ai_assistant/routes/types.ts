/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomRequestHandlerContext, KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { RacApiRequestHandlerContext } from '@kbn/rule-registry-plugin/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server/types';
import type { AlertingApiRequestHandlerContext } from '@kbn/alerting-plugin/server/types';
import type { ObservabilityAIAssistantService } from '../service';
import type {
  ObservabilityPluginSetupDependencies,
  ObservabilityPluginStartDependencies,
} from '../../../types';

export type ObservabilityAIAssistantRequestHandlerContext = CustomRequestHandlerContext<{
  rac: RacApiRequestHandlerContext;
  licensing: LicensingApiRequestHandlerContext;
  alerting: AlertingApiRequestHandlerContext;
}>;

export interface ObservabilityAIAssistantRouteHandlerResources {
  request: KibanaRequest;
  context: ObservabilityAIAssistantRequestHandlerContext;
  logger: Logger;
  service: ObservabilityAIAssistantService;
  plugins: {
    [key in keyof ObservabilityPluginSetupDependencies]: {
      setup: Required<ObservabilityPluginSetupDependencies>[key];
    };
  } & {
    [key in keyof ObservabilityPluginStartDependencies]: {
      start: () => Promise<Required<ObservabilityPluginStartDependencies>[key]>;
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
