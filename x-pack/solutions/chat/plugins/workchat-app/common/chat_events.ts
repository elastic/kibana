/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserMessage, AssistantMessage } from './conversation_events';

export interface ChatEventBase {
  type: string;
}

/**
 * Emitted when a message chunk is emitted by the LLM.
 */
export interface ChunkEvent extends ChatEventBase {
  type: 'message_chunk';
  content_chunk: string;
  message_id: string;
}

export interface ToolResultEvent extends ChatEventBase {
  type: 'tool_result';
  toolResult: {
    callId: string;
    result: string;
  };
}

export interface ProgressionEvent extends ChatEventBase {
  type: 'progression';
  progressionType: string;
  data: Record<string, any>;
}

/**
 * Emitted when a conversation was created.
 *
 * Can be used to update the UI with the new information.
 */
export interface ConversationCreatedEvent extends ChatEventBase {
  type: 'conversation_created';
  conversation: ConversationEventChanges;
}

/**
 * Emitted when a conversation was updated.
 *
 * Can be used to update the UI with the new information.
 */
export interface ConversationUpdatedEvent extends ChatEventBase {
  type: 'conversation_updated';
  conversation: ConversationEventChanges;
}

/**
 * Emitted when a full message was generated.
 */
export interface MessageEvent extends ChatEventBase {
  type: 'message';
  message: UserMessage | AssistantMessage;
}

export interface ConversationEventChanges {
  id: string;
  title: string;
}

export type ChatEvent =
  | ChunkEvent
  | MessageEvent
  | ConversationCreatedEvent
  | ConversationUpdatedEvent
  | ToolResultEvent
  | ProgressionEvent;

export const conversationCreatedEvent = ({
  id,
  title,
}: {
  id: string;
  title: string;
}): ConversationCreatedEvent => {
  return {
    type: 'conversation_created',
    conversation: { id, title },
  };
};

export const conversationUpdatedEvent = ({
  id,
  title,
}: {
  id: string;
  title: string;
}): ConversationUpdatedEvent => {
  return {
    type: 'conversation_updated',
    conversation: { id, title },
  };
};

/**
 * Creates a chunk event to represent partial content from an LLM response.
 */
export const chunkEvent = ({
  contentChunk,
  messageId,
}: {
  contentChunk: string;
  messageId: string;
}): ChunkEvent => {
  return {
    type: 'message_chunk',
    content_chunk: contentChunk,
    message_id: messageId,
  };
};

/**
 * Creates a message event to represent a complete message from either a user or assistant.
 */
export const messageEvent = ({
  message,
}: {
  message: UserMessage | AssistantMessage;
}): MessageEvent => {
  return {
    type: 'message',
    message,
  };
};

/**
 * Creates a tool result event to represent the result of a tool execution.
 */
export const toolResultEvent = ({
  callId,
  result,
}: {
  callId: string;
  result: string;
}): ToolResultEvent => {
  return {
    type: 'tool_result',
    toolResult: {
      callId,
      result,
    },
  };
};

export const isMessageEvent = (event: ChatEvent): event is MessageEvent => {
  return event.type === 'message';
};

export const isChunkEvent = (event: ChatEvent): event is ChunkEvent => {
  return event.type === 'message_chunk';
};

export const isToolResultEvent = (event: ChatEvent): event is ToolResultEvent => {
  return event.type === 'tool_result';
};

export const isConversationCreatedEvent = (event: ChatEvent): event is ConversationCreatedEvent => {
  return event.type === 'conversation_created';
};

export const isConversationUpdatedEvent = (event: ChatEvent): event is ConversationUpdatedEvent => {
  return event.type === 'conversation_updated';
};
