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
  ObservabilityAIAssistantChatService,
  RegisterRenderFunctionDefinition,
  RenderFunction,
} from './types';

export type {
  ObservabilityAIAssistantPublicSetup,
  ObservabilityAIAssistantPublicStart,
  ObservabilityAIAssistantService,
  ObservabilityAIAssistantChatService,
  RegisterRenderFunctionDefinition,
  RenderFunction,
};

export { aiAssistantCapabilities } from '../common/capabilities';
export { AssistantAvatar } from './components/assistant_avatar';
export { ConnectorSelectorBase } from './components/connector_selector/connector_selector_base';
export { useAbortableAsync, type AbortableAsyncState } from './hooks/use_abortable_async';
export { useGenAIConnectorsWithoutContext } from './hooks/use_genai_connectors';

export { createStorybookChatService, createStorybookService } from './storybook_mock';

export { createScreenContextAction } from './utils/create_screen_context_action';

export { ChatState } from './hooks/use_chat';

export { FeedbackButtons, type Feedback } from './components/buttons/feedback_buttons';
export { ChatItemControls } from './components/chat/chat_item_controls';

export { FailedToLoadResponse } from './components/message_panel/failed_to_load_response';

export { MessageText } from './components/message_panel/message_text';

export {
  type ChatActionClickHandler,
  ChatActionClickType,
  type ChatActionClickPayload,
} from './components/chat/types';

export {
  VisualizeESQLUserIntention,
  VISUALIZE_ESQL_USER_INTENTIONS,
} from '../common/functions/visualize_esql';

export { isSupportedConnectorType } from '../common';
export { FunctionVisibility } from '../common';

export type { TelemetryEventTypeWithPayload } from './analytics';
export { ObservabilityAIAssistantTelemetryEventType } from './analytics/telemetry_event_type';

export type { Conversation, Message, KnowledgeBaseEntry } from '../common';
export { MessageRole, KnowledgeBaseEntryRole } from '../common';

export { createFunctionRequestMessage } from '../common/utils/create_function_request_message';
export { createFunctionResponseMessage } from '../common/utils/create_function_response_message';

export type {
  ObservabilityAIAssistantAPIClientRequestParamsOf,
  ObservabilityAIAssistantAPIEndpoint,
  APIReturnType,
} from './api';

export type { UseChatResult } from './hooks/use_chat';
export { LANGUAGE_OPTIONS, DEFAULT_LANGUAGE_OPTION } from '../common/ui_settings/language_options';

export {
  aiAssistantResponseLanguage,
  aiAssistantLogsIndexPattern,
  aiAssistantSimulatedFunctionCalling,
  aiAssistantSearchConnectorIndexPattern,
} from '../common/ui_settings/settings_keys';

export const plugin: PluginInitializer<
  ObservabilityAIAssistantPublicSetup,
  ObservabilityAIAssistantPublicStart,
  ObservabilityAIAssistantPluginSetupDependencies,
  ObservabilityAIAssistantPluginStartDependencies
> = (pluginInitializerContext: PluginInitializerContext<ConfigSchema>) =>
  new ObservabilityAIAssistantPlugin(pluginInitializerContext);
