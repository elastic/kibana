/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { filter, map, Observable, tap } from 'rxjs';
import { v4 } from 'uuid';
import {
  type ChatCompletionChunkEvent,
  createInternalServerError,
  createTokenLimitReachedError,
  StreamingChatResponseEventType,
} from '../conversation_complete';
import type { CreateChatCompletionResponseChunk } from '../types';

export function processOpenAiStream() {
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
        return {
          id,
          type: StreamingChatResponseEventType.ChatCompletionChunk,
          message: {
            content: chunk.choices[0].delta.content || '',
            function_call: chunk.choices[0].delta.function_call,
          },
        };
      })
    );
  };
}
