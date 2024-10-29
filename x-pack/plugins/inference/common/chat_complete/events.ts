/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceTaskEventBase } from '../inference_task';
import type { ToolCallsOf, ToolOptions } from './tools';

export enum ChatCompletionEventType {
  ChatCompletionChunk = 'chatCompletionChunk',
  ChatCompletionTokenCount = 'chatCompletionTokenCount',
  ChatCompletionMessage = 'chatCompletionMessage',
}

export type ChatCompletionMessageEvent<TToolOptions extends ToolOptions = ToolOptions> =
  InferenceTaskEventBase<ChatCompletionEventType.ChatCompletionMessage> & {
    content: string;
  } & { toolCalls: ToolCallsOf<TToolOptions>['toolCalls'] };

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
