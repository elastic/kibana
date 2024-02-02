/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, Observable, tap } from 'rxjs';
import {
  ChatCompletionError,
  ChatCompletionErrorCode,
  type StreamingChatResponseEvent,
  StreamingChatResponseEventType,
  type ChatCompletionErrorEvent,
} from '../conversation_complete';

export function throwSerializedChatCompletionErrors() {
  return <T extends StreamingChatResponseEvent>(
    source$: Observable<StreamingChatResponseEvent>
  ): Observable<Exclude<T, ChatCompletionErrorEvent>> => {
    return source$.pipe(
      tap((event) => {
        // de-serialise error
        if (event.type === StreamingChatResponseEventType.ChatCompletionError) {
          const code = event.error.code ?? ChatCompletionErrorCode.InternalError;
          const message = event.error.message;
          const meta = event.error.meta;
          throw new ChatCompletionError(code, message, meta);
        }
      }),
      filter(
        (event): event is Exclude<T, ChatCompletionErrorEvent> =>
          event.type !== StreamingChatResponseEventType.ChatCompletionError
      )
    );
  };
}
