/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreStart,
  CustomRequestHandlerContext,
  IScopedClusterClient,
  IUiSettingsClient,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server/types';
import type { RacApiRequestHandlerContext } from '@kbn/rule-registry-plugin/server';
import type { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import type { ObservabilityAIAssistantService } from '../service';
import type {
  ObservabilityAIAssistantPluginSetupDependencies,
  ObservabilityAIAssistantPluginStartDependencies,
} from '../types';

export type ObservabilityAIAssistantRequestHandlerContext = Omit<
  CustomRequestHandlerContext<{
    licensing: Pick<LicensingApiRequestHandlerContext, 'license' | 'featureUsage'>;
    // these two are here for compatibility with APM functions
    rac: Pick<RacApiRequestHandlerContext, 'getAlertsClient'>;
    alerting: {
      getRulesClient: () => RulesClientApi;
    };
  }>,
  'core' | 'resolve'
> & {
  core: Promise<{
    elasticsearch: {
      client: IScopedClusterClient;
    };
    uiSettings: {
      client: IUiSettingsClient;
      globalClient: IUiSettingsClient;
    };
    savedObjects: {
      client: SavedObjectsClientContract;
    };
    coreStart: CoreStart;
  }>;
};

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
      payload?: number;
      idleSocket?: number;
    };
    tags: Array<'access:ai_assistant'>;
  };
}
