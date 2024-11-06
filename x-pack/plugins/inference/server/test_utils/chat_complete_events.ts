/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ChatCompletionChunkEvent,
  ChatCompletionEventType,
  ChatCompletionTokenCountEvent,
  ChatCompletionMessageEvent,
  ChatCompletionTokenCount,
  ToolCall,
} from '@kbn/inference-common';

export const chunkEvent = (content: string = 'chunk'): ChatCompletionChunkEvent => ({
  type: ChatCompletionEventType.ChatCompletionChunk,
  content,
  tool_calls: [],
});

export const messageEvent = (
  content: string = 'message',
  toolCalls: Array<ToolCall<string, any>> = []
): ChatCompletionMessageEvent => ({
  type: ChatCompletionEventType.ChatCompletionMessage,
  content,
  toolCalls,
});

export const tokensEvent = (tokens?: ChatCompletionTokenCount): ChatCompletionTokenCountEvent => ({
  type: ChatCompletionEventType.ChatCompletionTokenCount,
  tokens: {
    prompt: tokens?.prompt ?? 10,
    completion: tokens?.completion ?? 20,
    total: tokens?.total ?? 30,
  },
});
