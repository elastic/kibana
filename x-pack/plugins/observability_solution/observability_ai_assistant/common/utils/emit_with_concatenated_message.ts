/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { concat, from, last, mergeMap, Observable, shareReplay, withLatestFrom } from 'rxjs';
import {
  ChatCompletionChunkEvent,
  MessageAddEvent,
  StreamingChatResponseEventType,
} from '../conversation_complete';
import {
  concatenateChatCompletionChunks,
  ConcatenatedMessage,
} from './concatenate_chat_completion_chunks';

type ConcatenateMessageCallback = (
  concatenatedMessage: ConcatenatedMessage
) => Promise<ConcatenatedMessage>;

function mergeWithEditedMessage(
  originalMessage: ConcatenatedMessage,
  chunkEvent: ChatCompletionChunkEvent,
  callback?: ConcatenateMessageCallback
): Observable<MessageAddEvent> {
  return from(
    (callback ? callback(originalMessage) : Promise.resolve(originalMessage)).then((message) => {
      const next: MessageAddEvent = {
        type: StreamingChatResponseEventType.MessageAdd as const,
        id: chunkEvent.id,
        message: {
          '@timestamp': new Date().toISOString(),
          ...message,
        },
      };
      return next;
    })
  );
}

export function emitWithConcatenatedMessage(
  callback?: ConcatenateMessageCallback
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
        mergeMap(([message, chunkEvent]) => {
          return mergeWithEditedMessage(message, chunkEvent, callback);
        })
      )
    );

    return response$;
  };
}
