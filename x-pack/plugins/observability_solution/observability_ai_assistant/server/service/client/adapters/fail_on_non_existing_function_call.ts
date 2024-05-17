/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, ignoreElements, last, merge, shareReplay, tap } from 'rxjs';
import { FunctionDefinition, createFunctionNotFoundError } from '../../../../common';
import { ChatEvent } from '../../../../common/conversation_complete';
import { concatenateChatCompletionChunks } from '../../../../common/utils/concatenate_chat_completion_chunks';
import { withoutTokenCountEvents } from '../../../../common/utils/without_token_count_events';

export function failOnNonExistingFunctionCall({
  functions,
}: {
  functions?: Array<Pick<FunctionDefinition, 'name' | 'description' | 'parameters'>>;
}) {
  return (source$: Observable<ChatEvent>) => {
    const shared$ = source$.pipe(shareReplay());

    return merge(
      shared$,
      shared$.pipe(
        withoutTokenCountEvents(),
        concatenateChatCompletionChunks(),
        last(),
        tap((event) => {
          if (
            event.message.function_call.name &&
            functions?.find((fn) => fn.name === event.message.function_call.name) === undefined
          ) {
            throw createFunctionNotFoundError(event.message.function_call.name);
          }
        }),
        ignoreElements()
      )
    );
  };
}
