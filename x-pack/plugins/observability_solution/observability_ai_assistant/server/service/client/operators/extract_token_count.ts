/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, OperatorFunction, scan, endWith } from 'rxjs';
import {
  StreamingChatResponseEvent,
  StreamingChatResponseEventType,
  TokenCountEvent,
} from '../../../../common/conversation_complete';

export function extractTokenCount(): OperatorFunction<
  StreamingChatResponseEvent,
  TokenCountEvent['tokens']
> {
  return (events$) => {
    return events$.pipe(
      filter(
        (event): event is TokenCountEvent =>
          event.type === StreamingChatResponseEventType.TokenCount
      ),
      scan(
        (acc, event) => {
          acc.completion += event?.tokens?.completion ?? 0;
          acc.prompt += event?.tokens?.prompt ?? 0;
          acc.total += event?.tokens?.total ?? 0;
          return acc;
        },
        { completion: 0, prompt: 0, total: 0 }
      ),
      // Emit a default value at the end if no events were processed
      endWith({ completion: 0, prompt: 0, total: 0 })
    );
  };
}
