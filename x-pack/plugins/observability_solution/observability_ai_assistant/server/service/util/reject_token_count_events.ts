/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, Observable } from 'rxjs';
import {
  ChatCompletionChunkEvent,
  StreamingChatResponseEventType,
  TokenCountEvent,
} from '../../../common/conversation_complete';

export function rejectTokenCountEvents() {
  return <T extends ChatCompletionChunkEvent | TokenCountEvent>(
    source: Observable<T>
  ): Observable<Exclude<T, TokenCountEvent>> => {
    return source.pipe(
      filter(
        (event): event is Exclude<T, TokenCountEvent> =>
          event.type !== StreamingChatResponseEventType.TokenCount
      )
    );
  };
}
