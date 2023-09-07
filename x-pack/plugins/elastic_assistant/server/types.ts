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
import { CustomRequestHandlerContext } from '@kbn/core/server';
import { SecurityPluginStart, SecurityPluginSetup } from '@kbn/security-plugin/server';
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
  security: SecurityPluginSetup;
}
export interface ElasticAssistantPluginStartDependencies {
  actions: ActionsPluginStart;
  security: SecurityPluginStart;
}

export interface ElasticAssistantApiRequestHandlerContext {
  actions: ActionsPluginStart;
}

/**
 * @internal
 */
export type ElasticAssistantRequestHandlerContext = CustomRequestHandlerContext<{
  elasticAssistant: ElasticAssistantApiRequestHandlerContext;
}>;
