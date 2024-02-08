/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { concat, last, map, Observable, shareReplay, withLatestFrom } from 'rxjs';
import {
  ChatCompletionChunkEvent,
  MessageAddEvent,
  StreamingChatResponseEventType,
} from '../conversation_complete';
import {
  concatenateChatCompletionChunks,
  ConcatenatedMessage,
} from './concatenate_chat_completion_chunks';

export function emitWithConcatenatedMessage(
  callback?: (concatenatedMessage: ConcatenatedMessage) => ConcatenatedMessage
): (
  source$: Observable<ChatCompletionChunkEvent>
) => Observable<ChatCompletionChunkEvent | MessageAddEvent> {
  return (source$: Observable<ChatCompletionChunkEvent>) => {
    const shared = source$.pipe(shareReplay());

    const response$ = concat(
      shared,
      shared.pipe(
        concatenateChatCompletionChunks(),
        last(),
        withLatestFrom(source$),
        map(([message, chunkEvent]) => {
          const next: MessageAddEvent = {
            type: StreamingChatResponseEventType.MessageAdd as const,
            id: chunkEvent.id,
            message: {
              '@timestamp': new Date().toISOString(),
              ...(callback ? callback(message) : message),
            },
          };

          return next;
        })
      )
    );

    return response$;
  };
}
