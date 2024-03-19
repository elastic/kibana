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
  AnalyticsServiceSetup,
  CustomRequestHandlerContext,
  IRouter,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { type MlPluginSetup } from '@kbn/ml-plugin/server';
import { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { AuthenticatedUser, SecurityPluginStart } from '@kbn/security-plugin/server';
import { Tool } from 'langchain/dist/tools/base';
import { RetrievalQAChain } from 'langchain/chains';
import { ElasticsearchClient } from '@kbn/core/server';
import {
  AssistantFeatures,
  ExecuteConnectorRequestBody,
  Replacement,
} from '@kbn/elastic-assistant-common';
import { AIAssistantConversationsDataClient } from './ai_assistant_data_clients/conversations';
import type { GetRegisteredFeatures, GetRegisteredTools } from './services/app_context';
import { AIAssistantDataClient } from './ai_assistant_data_clients';

export const PLUGIN_ID = 'elasticAssistant' as const;

/** The plugin setup interface */
export interface ElasticAssistantPluginSetup {
  actions: ActionsPluginSetup;
}

/** The plugin start interface */
export interface ElasticAssistantPluginStart {
  /**
   * Actions plugin start contract.
   */
  actions: ActionsPluginStart;
  /**
   * Register features to be used by the elastic assistant.
   *
   * Note: Be sure to use the pluginName that is sent in the request headers by your plugin to ensure it is extracted
   * and the correct features are available. See {@link getPluginNameFromRequest} for more details.
   *
   * @param pluginName Name of the plugin the features should be registered to
   * @param features Partial<AssistantFeatures> to be registered with for the given plugin
   */
  registerFeatures: (pluginName: string, features: Partial<AssistantFeatures>) => void;
  /**
   * Get the registered features for a given plugin name.
   * @param pluginName Name of the plugin to get the features for
   */
  getRegisteredFeatures: GetRegisteredFeatures;
  /**
   * Register tools to be used by the elastic assistant.
   *
   * Note: Be sure to use the pluginName that is sent in the request headers by your plugin to ensure it is extracted
   * and the correct tools are selected. See {@link getPluginNameFromRequest} for more details.
   *
   * @param pluginName Name of the plugin the tool should be registered to
   * @param tools AssistantTools to be registered with for the given plugin
   */
  registerTools: (pluginName: string, tools: AssistantTool[]) => void;
  /**
   * Get the registered tools for a given plugin name.
   * @param pluginName Name of the plugin to get the tools for
   */
  getRegisteredTools: GetRegisteredTools;
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
  getRegisteredFeatures: GetRegisteredFeatures;
  getRegisteredTools: GetRegisteredTools;
  logger: Logger;
  getServerBasePath: () => string;
  getSpaceId: () => string;
  getCurrentUser: () => AuthenticatedUser | null;
  getAIAssistantConversationsDataClient: () => Promise<AIAssistantConversationsDataClient | null>;
  getAIAssistantPromptsDataClient: () => Promise<AIAssistantDataClient | null>;
  getAIAssistantAnonymizationFieldsDataClient: () => Promise<AIAssistantDataClient | null>;
  telemetry: AnalyticsServiceSetup;
}
/**
 * @internal
 */
export type ElasticAssistantRequestHandlerContext = CustomRequestHandlerContext<{
  elasticAssistant: ElasticAssistantApiRequestHandlerContext;
}>;

export type ElasticAssistantPluginRouter = IRouter<ElasticAssistantRequestHandlerContext>;

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
    prompts: string;
    anonymizationFields: string;
    kb: string;
  };
  indexTemplate: {
    conversations: string;
    prompts: string;
    anonymizationFields: string;
    kb: string;
  };
  aliases: {
    conversations: string;
    prompts: string;
    anonymizationFields: string;
    kb: string;
  };
  indexPatterns: {
    conversations: string;
    prompts: string;
    anonymizationFields: string;
    kb: string;
  };
  pipelines: {
    kb: string;
  };
}

export interface IIndexPatternString {
  pattern: string;
  alias: string;
  name: string;
  basePattern: string;
  validPrefixes?: string[];
  secondaryAlias?: string;
}

export interface PublicAIAssistantDataClient {
  getConversationsLimitValue: () => number;
}

export interface IAIAssistantDataClient {
  client(): PublicAIAssistantDataClient | null;
}

export interface AIAssistantPrompts {
  id: string;
}

/**
 * Interfaces for registering tools to be used by the elastic assistant
 */

export interface AssistantTool {
  id: string;
  name: string;
  description: string;
  sourceRegister: string;
  isSupported: (params: AssistantToolParams) => boolean;
  getTool: (params: AssistantToolParams) => Tool | null;
}

export interface AssistantToolParams {
  alertsIndexPattern?: string;
  allow?: string[];
  allowReplacement?: string[];
  isEnabledKnowledgeBase: boolean;
  chain: RetrievalQAChain;
  esClient: ElasticsearchClient;
  modelExists: boolean;
  onNewReplacements?: (newReplacements: Replacement[]) => void;
  replacements?: Replacement[];
  request: KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
  size?: number;
}
