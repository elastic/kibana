/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, toArray } from 'rxjs';
import {
  MessageAddEvent,
  StreamingChatResponseEventType,
  type ChatCompletionChunkEvent,
  type StreamingChatResponseEvent,
} from '../../../common/conversation_complete';

export function handleLlmResponse({
  signal,
  write,
  source$,
}: {
  signal: AbortSignal;
  write: (event: StreamingChatResponseEvent) => Promise<void>;
  source$: Observable<ChatCompletionChunkEvent | MessageAddEvent>;
}) {
  const writePromises: Array<Promise<void>> = [];

  return source$.pipe((source) => {
    return new Observable<MessageAddEvent>((subscriber) => {
      function writeOrFail(chunk: ChatCompletionChunkEvent) {
        return write(chunk).catch((err) => {
          subscriber.error(err);
          throw err;
        });
      }

      source.subscribe({
        next: (chunk) => {
          if (chunk.type === StreamingChatResponseEventType.ChatCompletionChunk) {
            writePromises.push(writeOrFail(chunk));
          }
        },
        complete: () => {
          Promise.all(writePromises).then(() => {
            subscriber.complete();
          });
        },
      });
    });
  }, toArray());
}
