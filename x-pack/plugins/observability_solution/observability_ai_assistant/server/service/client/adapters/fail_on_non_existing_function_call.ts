/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forkJoin, last, Observable, shareReplay, tap } from 'rxjs';
import {
  ChatCompletionChunkEvent,
  createFunctionNotFoundError,
  FunctionDefinition,
} from '../../../../common';
import { TokenCountEvent } from '../../../../common/conversation_complete';
import { concatenateChatCompletionChunks } from '../../../../common/utils/concatenate_chat_completion_chunks';
import { rejectTokenCountEvents } from '../../util/reject_token_count_events';

export function failOnNonExistingFunctionCall({
  functions,
}: {
  functions?: Array<Pick<FunctionDefinition, 'name' | 'description' | 'parameters'>>;
}) {
  return (source$: Observable<ChatCompletionChunkEvent | TokenCountEvent>) => {
    return new Observable<ChatCompletionChunkEvent | TokenCountEvent>((subscriber) => {
      const shared = source$.pipe(shareReplay());

      const checkFunctionCallResponse$ = shared.pipe(
        rejectTokenCountEvents(),
        concatenateChatCompletionChunks(),
        last(),
        tap((event) => {
          if (
            event.message.function_call.name &&
            functions?.find((fn) => fn.name === event.message.function_call.name) === undefined
          ) {
            throw createFunctionNotFoundError(event.message.function_call.name);
          }
        })
      );

      source$.subscribe({
        next: (val) => {
          subscriber.next(val);
        },
      });

      forkJoin([source$, checkFunctionCallResponse$]).subscribe({
        complete: () => {
          subscriber.complete();
        },
        error: (error) => {
          subscriber.error(error);
        },
      });
    });
  };
}
