/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { InferenceTaskEventBase } from '../inference_task';
import type { ToolCall, ToolCallsOf, ToolOptions } from './tools';

export enum MessageRole {
  User = 'user',
  Assistant = 'assistant',
  Tool = 'tool',
}

interface MessageBase<TRole extends MessageRole> {
  role: TRole;
}

export type UserMessage = MessageBase<MessageRole.User> & { content: string };

export type AssistantMessage = MessageBase<MessageRole.Assistant> & {
  content: string | null;
  toolCalls?: Array<ToolCall<string, Record<string, any> | undefined>>;
};

export type ToolMessage<TToolResponse extends Record<string, any> | unknown> =
  MessageBase<MessageRole.Tool> & {
    toolCallId: string;
    response: TToolResponse;
  };

export type Message = UserMessage | AssistantMessage | ToolMessage<unknown>;

export type ChatCompletionMessageEvent<TToolOptions extends ToolOptions = ToolOptions> =
  InferenceTaskEventBase<ChatCompletionEventType.ChatCompletionMessage> & {
    content: string;
  } & { toolCalls: ToolCallsOf<TToolOptions>['toolCalls'] };

export type ChatCompletionResponse<TToolOptions extends ToolOptions = ToolOptions> = Observable<
  ChatCompletionEvent<TToolOptions>
>;

export enum ChatCompletionEventType {
  ChatCompletionChunk = 'chatCompletionChunk',
  ChatCompletionTokenCount = 'chatCompletionTokenCount',
  ChatCompletionMessage = 'chatCompletionMessage',
}

export interface ChatCompletionChunkToolCall {
  index: number;
  toolCallId: string;
  function: {
    name: string;
    arguments: string;
  };
}

export type ChatCompletionChunkEvent =
  InferenceTaskEventBase<ChatCompletionEventType.ChatCompletionChunk> & {
    content: string;
    tool_calls: ChatCompletionChunkToolCall[];
  };

export type ChatCompletionTokenCountEvent =
  InferenceTaskEventBase<ChatCompletionEventType.ChatCompletionTokenCount> & {
    tokens: {
      prompt: number;
      completion: number;
      total: number;
    };
  };

export type ChatCompletionEvent<TToolOptions extends ToolOptions = ToolOptions> =
  | ChatCompletionChunkEvent
  | ChatCompletionTokenCountEvent
  | ChatCompletionMessageEvent<TToolOptions>;

/**
 * Request a completion from the LLM based on a prompt or conversation.
 *
 * @param {string} options.connectorId The ID of the connector to use
 * @param {string} [options.system] A system message that defines the behavior of the LLM.
 * @param {Message[]} options.message A list of messages that make up the conversation to be completed.
 * @param {ToolChoice} [options.toolChoice] Force the LLM to call a (specific) tool, or no tool
 * @param {Record<string, ToolDefinition>} [options.tools] A map of tools that can be called by the LLM
 */
export type ChatCompleteAPI = <TToolOptions extends ToolOptions = ToolOptions>(
  options: {
    connectorId: string;
    system?: string;
    messages: Message[];
  } & TToolOptions
) => ChatCompletionResponse<TToolOptions>;
