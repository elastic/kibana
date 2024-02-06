/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { repeat } from 'lodash';
import { Observable, OperatorFunction } from 'rxjs';
import {
  BufferFlushEvent,
  StreamingChatResponseEventType,
  StreamingChatResponseEventWithoutError,
} from '../../../common/conversation_complete';

export function flushBuffer<T extends StreamingChatResponseEventWithoutError>(
  isCloud: boolean
): OperatorFunction<T, T | BufferFlushEvent> {
  return (source: Observable<T>) =>
    isCloud
      ? new Observable<T | BufferFlushEvent>((subscriber) => {
          const cloudProxyBufferSize: number = 4096;
          let currentBufferSize: number = 0;

          const intervalId = setInterval(function flushBufferIfNeeded() {
            if (currentBufferSize && currentBufferSize <= cloudProxyBufferSize) {
              subscriber.next({
                data: repeat('0', cloudProxyBufferSize * 2),
                type: StreamingChatResponseEventType.BufferFlush,
              });
              currentBufferSize = 0;
            }
          }, 250);

          source.subscribe({
            next: (value) => {
              currentBufferSize =
                currentBufferSize <= cloudProxyBufferSize
                  ? JSON.stringify(value).length + currentBufferSize
                  : cloudProxyBufferSize;
              subscriber.next(value);
            },
            error: (error) => {
              clearInterval(intervalId);
              subscriber.error(error);
            },
            complete: () => {
              clearInterval(intervalId);
              subscriber.complete();
            },
          });
        })
      : source;
}
