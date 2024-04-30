/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import {
  catchError,
  ignoreElements,
  merge,
  OperatorFunction,
  shareReplay,
  tap,
  last,
  throwError,
  finalize,
} from 'rxjs';
import type { StreamingChatResponseEvent } from '../../../../common/conversation_complete';
import { extractTokenCount } from './extract_token_count';

export function instrumentAndCountTokens<T extends StreamingChatResponseEvent>(
  name: string
): OperatorFunction<T, T> {
  return (source$) => {
    const span = apm.startSpan(name);

    if (!span) {
      return source$;
    }
    span?.addLabels({
      plugin: 'observability_ai_assistant',
    });

    const shared$ = source$.pipe(shareReplay());

    let tokenCount = {
      prompt: 0,
      completion: 0,
      total: 0,
    };

    return merge(
      shared$,
      shared$.pipe(
        extractTokenCount(),
        tap((nextTokenCount) => {
          tokenCount = nextTokenCount;
        }),
        last(),
        tap(() => {
          span?.setOutcome('success');
        }),
        catchError((error) => {
          span?.setOutcome('failure');
          return throwError(() => error);
        }),
        finalize(() => {
          span?.addLabels({
            tokenCountPrompt: tokenCount.prompt,
            tokenCountCompletion: tokenCount.completion,
            tokenCountTotal: tokenCount.total,
          });
          span?.end();
        }),
        ignoreElements()
      )
    );
  };
}
