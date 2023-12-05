/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginSetupContract as ActionsPluginSetup,
  PluginStartContract as ActionsPluginStart,
} from '@kbn/actions-plugin/server';
import type {
  CoreRequestHandlerContext,
  CoreSetup,
  CustomRequestHandlerContext,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { type MlPluginSetup } from '@kbn/ml-plugin/server';
import { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { SecurityPluginStart } from '@kbn/security-plugin/server';
import { AIAssistantSOClient } from './saved_object/ai_assistant_so_client';
import { AIAssistantDataClient } from './ai_assistant_data_client';

/** The plugin setup interface */
export interface ElasticAssistantPluginSetup {
  actions: ActionsPluginSetup;
}

/** The plugin start interface */
export interface ElasticAssistantPluginStart {
  actions: ActionsPluginStart;
}

export interface ElasticAssistantPluginSetupDependencies {
  actions: ActionsPluginSetup;
  ml: MlPluginSetup;
  taskManager: TaskManagerSetupContract;
  spaces?: SpacesPluginSetup;
}
export interface ElasticAssistantPluginStartDependencies {
  actions: ActionsPluginStart;
  spaces?: SpacesPluginStart;
  security: SecurityPluginStart;
}

export interface ElasticAssistantApiRequestHandlerContext {
  core: CoreRequestHandlerContext;
  actions: ActionsPluginStart;
  logger: Logger;
  getServerBasePath: () => string;
  getSpaceId: () => string;
  getAIAssistantDataClient: () => Promise<AIAssistantDataClient | null>;
  getAIAssistantSOClient: () => AIAssistantSOClient;
}

/**
 * @internal
 */
export type ElasticAssistantRequestHandlerContext = CustomRequestHandlerContext<{
  elasticAssistant: ElasticAssistantApiRequestHandlerContext;
}>;

export type ElasticAssistantPluginCoreSetupDependencies = CoreSetup<
  ElasticAssistantPluginStartDependencies,
  ElasticAssistantPluginStart
>;

export type GetElser = (
  request: KibanaRequest,
  savedObjectsClient: SavedObjectsClientContract
) => Promise<string> | never;

export interface InitAssistantResult {
  assistantResourcesInstalled: boolean;
  assistantNamespaceResourcesInstalled: boolean;
  assistantSettingsCreated: boolean;
  errors: string[];
}

export interface AssistantResourceNames {
  componentTemplate: {
    conversations: string;
    kb: string;
  };
  indexTemplate: {
    conversations: string;
    kb: string;
  };
  aliases: {
    conversations: string;
    kb: string;
  };
  indexPatterns: {
    conversations: string;
    kb: string;
  };
  pipelines: {
    kb: string;
  };
}

export interface IIndexPatternString {
  template: string;
  pattern: string;
  alias: string;
  name: string;
  basePattern: string;
  validPrefixes?: string[];
  secondaryAlias?: string;
}

export interface PublicAIAssistantDataClient {
  
}

export interface IAIAssistantDataClient {
  client(): PublicAIAssistantDataClient | null;
}

export interface AIAssistantPrompts {
  id: string;
}
