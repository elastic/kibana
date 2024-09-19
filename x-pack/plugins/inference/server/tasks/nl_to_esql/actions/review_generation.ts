/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, map, merge, of, switchMap, lastValueFrom, tap } from 'rxjs';
import type { Logger } from '@kbn/logging';
import { ToolCall, ToolOptions } from '../../../../common/chat_complete/tools';
import {
  correctCommonEsqlMistakes,
  generateFakeToolCallId,
  isChatCompletionMessageEvent,
  Message,
  MessageRole,
  ToolSchema,
} from '../../../../common';
import { InferenceClient, withoutOutputUpdateEvents, withoutTokenCountEvents } from '../../..';
import { OutputCompleteEvent, OutputEventType } from '../../../../common/output';
import { INLINE_ESQL_QUERY_REGEX } from '../../../../common/tasks/nl_to_esql/constants';
import { EsqlDocumentBase } from '../doc_base';
import type { NlToEsqlTaskEvent } from '../types';
import type { FunctionCallingMode } from '../../../../common/chat_complete';
import type { ActionsOptionsBase } from './types';
import { extractQueries, validateQueryAst } from '../utils';

export const reviewEsqlGenerationFn = <TToolOptions extends ToolOptions>({
  logger,
  output$,
}: ActionsOptionsBase) => {
  return async function reviewEsqlGeneration({ messageWithQuery }: { messageWithQuery: string }) {
    const queries = extractQueries(messageWithQuery);

    const queriesWithErrors = await Promise.all(
      queries.map(async (query) => {
        const astErrors = await validateQueryAst(query.query);
        return {
          ...query,
          astErrors,
        };
      })
    );

    const hasErrors = queriesWithErrors.some((query) => query.astErrors.length > 0);

    // TODO: simulate a tool call event
    // output$.next(event);

    return {
      hasErrors,
      queries: queriesWithErrors,
    };
  };
};
