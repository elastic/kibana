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
}
export interface ElasticAssistantPluginStartDependencies {
  actions: ActionsPluginStart;
}

export interface ElasticAssistantApiRequestHandlerContext {
  actions: ActionsPluginStart;
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
