/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import { ObservabilityAIAssistantPlugin } from './plugin';
import type {
  ObservabilityAIAssistantPublicSetup,
  ObservabilityAIAssistantPublicStart,
  ObservabilityAIAssistantPluginSetupDependencies,
  ObservabilityAIAssistantPluginStartDependencies,
  ConfigSchema,
  ObservabilityAIAssistantService,
  RegisterRenderFunctionDefinition,
  RenderFunction,
} from './types';

export type {
  ObservabilityAIAssistantPublicSetup,
  ObservabilityAIAssistantPublicStart,
  ObservabilityAIAssistantService,
  RegisterRenderFunctionDefinition,
  RenderFunction,
};

export { type ChatActionClickHandler, ChatActionClickType } from './components/chat/types';

export {
  VisualizeESQLUserIntention,
  VISUALIZE_ESQL_USER_INTENTIONS,
} from '../common/functions/visualize_esql';

export type { Conversation, Message, KnowledgeBaseEntry } from '../common';
export { MessageRole, KnowledgeBaseEntryRole } from '../common';

export type {
  ObservabilityAIAssistantAPIClientRequestParamsOf,
  ObservabilityAIAssistantAPIEndpoint,
  APIReturnType,
} from './api';

export const plugin: PluginInitializer<
  ObservabilityAIAssistantPublicSetup,
  ObservabilityAIAssistantPublicStart,
  ObservabilityAIAssistantPluginSetupDependencies,
  ObservabilityAIAssistantPluginStartDependencies
> = (pluginInitializerContext: PluginInitializerContext<ConfigSchema>) =>
  new ObservabilityAIAssistantPlugin(pluginInitializerContext);
