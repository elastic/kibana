/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import OpenAI from 'openai';
import { filter, map, Observable, tap } from 'rxjs';
import { v4 } from 'uuid';
import type { Logger } from '@kbn/logging';
import { Message } from '..';
import {
  type ChatCompletionChunkEvent,
  createInternalServerError,
  createTokenLimitReachedError,
  StreamingChatResponseEventType,
} from '../conversation_complete';

export type CreateChatCompletionResponseChunk = OpenAI.ChatCompletionChunk;

export function processOpenAiStream(logger: Logger) {
  return (source: Observable<string>): Observable<ChatCompletionChunkEvent> => {
    const id = v4();

    return source.pipe(
      filter((line) => !!line && line !== '[DONE]'),
      map(
        (line) =>
          JSON.parse(line) as CreateChatCompletionResponseChunk | { error: { message: string } }
      ),
      tap((line) => {
        if ('error' in line) {
          throw createInternalServerError(line.error.message);
        }
        if (
          'choices' in line &&
          line.choices.length &&
          line.choices[0].finish_reason === 'length'
        ) {
          throw createTokenLimitReachedError();
        }
      }),
      filter(
        (line): line is CreateChatCompletionResponseChunk =>
          'object' in line && line.object === 'chat.completion.chunk'
      ),
      map((chunk): ChatCompletionChunkEvent => {
        const delta = chunk.choices[0].delta;
        if (delta.tool_calls && delta.tool_calls.length > 1) {
          logger.warn(`More tools than 1 were called: ${JSON.stringify(delta.tool_calls)}`);
        }

        const functionCall: Omit<Message['message']['function_call'], 'trigger'> | undefined =
          delta.tool_calls
            ? {
                name: delta.tool_calls[0].function?.name,
                arguments: delta.tool_calls[0].function?.arguments,
              }
            : delta.function_call;

        return {
          id,
          type: StreamingChatResponseEventType.ChatCompletionChunk,
          message: {
            content: delta.content ?? '',
            function_call: functionCall,
          },
        };
      })
    );
  };
}
