/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { ContentRef } from '@kbn/wci-common';

export enum ConversationEventType {
  userMessage = 'user_message',
  assistantMessage = 'assistant_message',
  toolResult = 'tool_result',
}

/**
 * Base interface for conversation events
 */
export interface ConversationEventBase<T extends ConversationEventType> {
  /**
   * Type of the event.
   */
  type: T;
  /**
   * ID for this event.
   * Must be unique across all events of a given conversation.
   */
  id: string;
  /**
   * Creation date for this event, ISO format.
   */
  createdAt: string;
}

/**
 * Represents a message from the user.
 */
export interface UserMessage extends ConversationEventBase<ConversationEventType.userMessage> {
  /**
   * The text content of the message
   */
  content: string;
}

/**
 * Represents a message from the assistant
 */
export interface AssistantMessage
  extends ConversationEventBase<ConversationEventType.assistantMessage> {
  /**
   * The text content of the message.
   * Can be blank if toolCalls is not empty.
   */
  content: string;
  /**
   * list of tool calls done by the assistant.
   */
  toolCalls: ToolCall[];
  /**
   * list of citations that were used by the assistant to generate the message.
   */
  citations: ContentRef[];
}

/**
 * Represents a tool being executed
 */
export interface ToolResult extends ConversationEventBase<ConversationEventType.toolResult> {
  toolCallId: string;
  toolResult: string;
}

/**
 * Composite of all possible conversation event types
 */
export type ConversationEvent = UserMessage | AssistantMessage | ToolResult;

/**
 * Represents a tool call that was requested by the assistant
 */
export interface ToolCall {
  toolCallId: string;
  toolName: string;
  args: Record<string, any>;
}

export const createUserMessage = (
  parts: Partial<Omit<UserMessage, 'type'>> & Pick<UserMessage, 'content'>
): UserMessage => {
  return {
    type: ConversationEventType.userMessage,
    id: parts.id ?? uuidv4(),
    content: parts.content,
    createdAt: parts.createdAt ?? new Date().toISOString(),
  };
};

export const createAssistantMessage = (
  parts: Partial<Omit<AssistantMessage, 'type'>>
): AssistantMessage => {
  return {
    type: ConversationEventType.assistantMessage,
    id: parts.id ?? uuidv4(),
    content: parts.content ?? '',
    toolCalls: parts.toolCalls ?? [],
    citations: parts.citations ?? [],
    createdAt: parts.createdAt ?? new Date().toISOString(),
  };
};

export const createToolResult = (
  parts: Partial<Omit<ToolResult, 'type'>> & Pick<ToolResult, 'toolCallId' | 'toolResult'>
): ToolResult => {
  return {
    type: ConversationEventType.toolResult,
    id: parts.id ?? uuidv4(),
    toolCallId: parts.toolCallId,
    toolResult: parts.toolResult,
    createdAt: parts.createdAt ?? new Date().toISOString(),
  };
};

export const isUserMessage = (event: ConversationEvent): event is UserMessage => {
  return event.type === ConversationEventType.userMessage;
};

export const isAssistantMessage = (event: ConversationEvent): event is AssistantMessage => {
  return event.type === ConversationEventType.assistantMessage;
};

export const isToolResult = (event: ConversationEvent): event is ToolResult => {
  return event.type === ConversationEventType.toolResult;
};
