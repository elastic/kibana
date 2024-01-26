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
  type StreamingChatResponseEventWithoutError,
} from '../conversation_complete';

export function throwSerializedChatCompletionErrors() {
  return (
    source$: Observable<StreamingChatResponseEvent>
  ): Observable<StreamingChatResponseEventWithoutError> => {
    return source$.pipe(
      tap((event) => {
        if (event.type === StreamingChatResponseEventType.ChatCompletionError) {
          const code = event.error.code ?? ChatCompletionErrorCode.InternalError;
          const message = event.error.message;
          throw new ChatCompletionError(code, message);
        }
      }),
      filter(
        (event): event is StreamingChatResponseEventWithoutError =>
          event.type !== StreamingChatResponseEventType.ChatCompletionError
      )
    );
  };
}
