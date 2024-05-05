/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { Message, Conversation, KnowledgeBaseEntry } from './types';
export type { ConversationCreateRequest } from './types';
export { KnowledgeBaseEntryRole, MessageRole } from './types';
export type { FunctionDefinition } from './functions/types';
export { FunctionVisibility } from './functions/function_visibility';
export {
  VISUALIZE_ESQL_USER_INTENTIONS,
  VisualizeESQLUserIntention,
} from './functions/visualize_esql';

export type {
  ChatCompletionChunkEvent,
  ConversationCreateEvent,
  ConversationUpdateEvent,
  MessageAddEvent,
  ChatCompletionErrorEvent,
  BufferFlushEvent,
  StreamingChatResponseEvent,
  StreamingChatResponseEventWithoutError,
} from './conversation_complete';
export {
  StreamingChatResponseEventType,
  ChatCompletionErrorCode,
  ChatCompletionError,
  createTokenLimitReachedError,
  createConversationNotFoundError,
  createInternalServerError,
  isTokenLimitReachedError,
  isChatCompletionError,
  createFunctionNotFoundError,
} from './conversation_complete';

export {
  aiAssistantResponseLanguage,
  aiAssistantLogsIndexPattern,
  aiAssistantSimulatedFunctionCalling,
} from './ui_settings/settings_keys';

export { concatenateChatCompletionChunks } from './utils/concatenate_chat_completion_chunks';

export { DEFAULT_LANGUAGE_OPTION, LANGUAGE_OPTIONS } from './ui_settings/language_options';

export { isSupportedConnectorType } from './connectors';
