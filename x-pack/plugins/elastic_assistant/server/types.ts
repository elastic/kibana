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
import { AIAssistantDataClient } from './conversations_data_client';
import { AIAssistantSOClient } from './saved_object/ai_assistant_so_client';
import { RequestBody } from './lib/langchain/types';
import type { GetRegisteredTools } from './services/app_context';

export const PLUGIN_ID = 'elasticAssistant' as const;

/** The plugin setup interface */
export interface ElasticAssistantPluginSetup {
  actions: ActionsPluginSetup;
}

/** The plugin start interface */
export interface ElasticAssistantPluginStart {
  actions: ActionsPluginStart;
  /**
   * Register tools to be used by the elastic assistant
   * @param pluginName Name of the plugin the tool should be registered to
   * @param tools AssistantTools to be registered with for the given plugin
   */
  registerTools: (pluginName: string, tools: AssistantTool[]) => void;
  /**
   * Get the registered tools
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
  getRegisteredTools: GetRegisteredTools;
  logger: Logger;
  getServerBasePath: () => string;
  getSpaceId: () => string;
  getCurrentUser: () => AuthenticatedUser | null;
  getAIAssistantDataClient: () => Promise<AIAssistantDataClient | null>;
  getAIAssistantSOClient: () => AIAssistantSOClient;
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
  assistantLangChain: boolean;
  chain: RetrievalQAChain;
  esClient: ElasticsearchClient;
  modelExists: boolean;
  onNewReplacements?: (newReplacements: Record<string, string>) => void;
  replacements?: Record<string, string>;
  request: KibanaRequest<unknown, unknown, RequestBody>;
  size?: number;
}
