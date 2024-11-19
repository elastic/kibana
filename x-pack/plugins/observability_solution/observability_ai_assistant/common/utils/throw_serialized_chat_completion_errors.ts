/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, OperatorFunction, tap } from 'rxjs';
import {
  ChatCompletionError,
  ChatCompletionErrorCode,
  type StreamingChatResponseEvent,
  StreamingChatResponseEventType,
  type ChatCompletionErrorEvent,
  BufferFlushEvent,
} from '../conversation_complete';

export function throwSerializedChatCompletionErrors<
  T extends StreamingChatResponseEvent | BufferFlushEvent
>(): OperatorFunction<T, Exclude<T, ChatCompletionErrorEvent>> {
  return (source$) =>
    source$.pipe(
      tap((event) => {
        // de-serialize error
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
}
