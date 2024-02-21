/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import { ObservabilityAIAssistantPlugin } from './plugin';
import type {
  ObservabilityAIAssistantPluginSetup,
  ObservabilityAIAssistantPluginStart,
  ObservabilityAIAssistantPluginSetupDependencies,
  ObservabilityAIAssistantPluginStartDependencies,
  ConfigSchema,
  ObservabilityAIAssistantService,
} from './types';

export type {
  ObservabilityAIAssistantPluginSetup,
  ObservabilityAIAssistantPluginStart,
  ObservabilityAIAssistantService,
};

export type { Conversation, Message, KnowledgeBaseEntry } from '../common';
export { MessageRole, KnowledgeBaseEntryRole } from '../common';

export type {
  ObservabilityAIAssistantAPIClientRequestParamsOf,
  ObservabilityAIAssistantAPIEndpoint,
  APIReturnType,
} from './api';

export const plugin: PluginInitializer<
  ObservabilityAIAssistantPluginSetup,
  ObservabilityAIAssistantPluginStart,
  ObservabilityAIAssistantPluginSetupDependencies,
  ObservabilityAIAssistantPluginStartDependencies
> = (pluginInitializerContext: PluginInitializerContext<ConfigSchema>) =>
  new ObservabilityAIAssistantPlugin(pluginInitializerContext);
