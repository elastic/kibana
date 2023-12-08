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
  CustomRequestHandlerContext,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { type MlPluginSetup } from '@kbn/ml-plugin/server';
import { Tool } from 'langchain/dist/tools/base';
import { RetrievalQAChain } from 'langchain/chains';
import { ElasticsearchClient } from '@kbn/core/server';
import { RequestBody } from './lib/langchain/types';

export const PLUGIN_ID = 'elasticAssistant' as const;

export interface GetApplicableToolsParams {
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

export type GetApplicableTools = (params: GetApplicableToolsParams) => Tool[];

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
   * @param getApplicableTools Function that returns the tools for the specified plugin
   */
  registerTools: (pluginName: string, getApplicableTools: GetApplicableTools) => void;
  /**
   * Get the registered tools
   * @param pluginName Name of the plugin to get the tools for
   */
  getRegisteredTools: (pluginName: string) => Tool[];
}

export interface ElasticAssistantPluginSetupDependencies {
  actions: ActionsPluginSetup;
  ml: MlPluginSetup;
}
export interface ElasticAssistantPluginStartDependencies {
  actions: ActionsPluginStart;
}

export interface ElasticAssistantApiRequestHandlerContext {
  actions: ActionsPluginStart;
  getRegisteredTools: (
    pluginName: string,
    getApplicableToolsParams: GetApplicableToolsParams
  ) => Tool[];
  logger: Logger;
}

/**
 * @internal
 */
export type ElasticAssistantRequestHandlerContext = CustomRequestHandlerContext<{
  elasticAssistant: ElasticAssistantApiRequestHandlerContext;
}>;

export type GetElser = (
  request: KibanaRequest,
  savedObjectsClient: SavedObjectsClientContract
) => Promise<string> | never;
