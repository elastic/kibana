/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, OperatorFunction, map } from 'rxjs';
import { v4 } from 'uuid';
import {
  ChatCompletionEvent as InferenceChatCompletionEvent,
  ChatCompletionEventType as InferenceChatCompletionEventType,
} from '@kbn/inference-common';
import {
  ChatCompletionChunkEvent,
  TokenCountEvent,
  ChatCompletionMessageEvent,
  StreamingChatResponseEventType,
} from '../../../../common';

export function convertInferenceEventsToStreamingEvents(): OperatorFunction<
  InferenceChatCompletionEvent,
  ChatCompletionChunkEvent | TokenCountEvent | ChatCompletionMessageEvent
> {
  return (events$: Observable<InferenceChatCompletionEvent>) => {
    return events$.pipe(
      map((event) => {
        switch (event.type) {
          case InferenceChatCompletionEventType.ChatCompletionChunk:
            // Convert to ChatCompletionChunkEvent
            return {
              type: StreamingChatResponseEventType.ChatCompletionChunk,
              id: v4(),
              message: {
                content: event.content,
                function_call:
                  event.tool_calls.length > 0
                    ? {
                        name: event.tool_calls[0].function.name,
                        arguments: event.tool_calls[0].function.arguments,
                      }
                    : undefined,
              },
            } as ChatCompletionChunkEvent;
          case InferenceChatCompletionEventType.ChatCompletionTokenCount:
            // Convert to TokenCountEvent
            return {
              type: StreamingChatResponseEventType.TokenCount,
              tokens: {
                completion: event.tokens.completion,
                prompt: event.tokens.prompt,
                total: event.tokens.total,
              },
            } as TokenCountEvent;
          case InferenceChatCompletionEventType.ChatCompletionMessage:
            // Convert to ChatCompletionMessageEvent
            return {
              type: StreamingChatResponseEventType.ChatCompletionMessage,
              id: v4(),
              message: {
                content: event.content,
                function_call:
                  event.toolCalls.length > 0
                    ? {
                        name: event.toolCalls[0].function.name,
                        arguments: event.toolCalls[0].function.arguments,
                      }
                    : undefined,
              },
            } as ChatCompletionMessageEvent;
          default:
            throw new Error(`Unknown event type`);
        }
      })
    );
  };
}
