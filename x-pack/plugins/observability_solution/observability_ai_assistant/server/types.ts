/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  PluginStartContract as FeaturesPluginStart,
  PluginSetupContract as FeaturesPluginSetup,
} from '@kbn/features-plugin/server';
import type {
  PluginSetupContract as ActionsPluginSetup,
  PluginStartContract as ActionsPluginStart,
} from '@kbn/actions-plugin/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type {
  DataViewsServerPluginSetup,
  DataViewsServerPluginStart,
} from '@kbn/data-views-plugin/server';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/server';
import type { ServerlessPluginSetup, ServerlessPluginStart } from '@kbn/serverless/server';
import type { ObservabilityAIAssistantService } from './service';

export interface ObservabilityAIAssistantServerSetup {
  /**
   * Returns a Observability AI Assistant service instance
   */
  service: ObservabilityAIAssistantService;
}

export interface ObservabilityAIAssistantServerStart {
  /**
   * Returns a Observability AI Assistant service instance
   */
  service: ObservabilityAIAssistantService;
}

export interface ObservabilityAIAssistantPluginSetupDependencies {
  actions: ActionsPluginSetup;
  security: SecurityPluginSetup;
  features: FeaturesPluginSetup;
  taskManager: TaskManagerSetupContract;
  dataViews: DataViewsServerPluginSetup;
  licensing: LicensingPluginSetup;
  cloud?: CloudSetup;
  serverless?: ServerlessPluginSetup;
}

export interface ObservabilityAIAssistantPluginStartDependencies {
  actions: ActionsPluginStart;
  security: SecurityPluginStart;
  features: FeaturesPluginStart;
  taskManager: TaskManagerStartContract;
  dataViews: DataViewsServerPluginStart;
  licensing: LicensingPluginStart;
  cloud?: CloudStart;
  serverless?: ServerlessPluginStart;
}
