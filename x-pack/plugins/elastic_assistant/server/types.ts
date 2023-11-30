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
   * @param tool The tool to register
   */
  registerTool: (pluginName: string, tool: Tool) => void;
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
  getRegisteredTools: (pluginName: string) => Tool[];
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
