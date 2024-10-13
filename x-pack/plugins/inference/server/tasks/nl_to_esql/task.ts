/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'lodash';
import { from, Observable, Subject, switchMap } from 'rxjs';
import { Message, MessageRole } from '../../../common/chat_complete';
import type { ToolOptions } from '../../../common/chat_complete/tools';
import { EsqlDocumentBase } from './doc_base';
import { type ActionsOptionsBase, generateEsqlTask, requestDocumentationFn } from './actions';
import { NlToEsqlTaskEvent, NlToEsqlTaskParams } from './types';
import { summarizeDiscussionFn } from './actions/summarize_discussion';
import { reviewEsqlGenerationFn } from './actions/review_generation';
import { correctEsqlGenerationFn } from './actions/correct_generation';
import { withoutChunkEvents } from '../../../common/chat_complete/without_chunk_events';
import { withoutTokenCountEvents } from '../../../common/chat_complete/without_token_count_events';
import { INLINE_ESQL_QUERY_REGEX } from '/../../../common/tasks/nl_to_esql/constants';

const loadDocBase = once(() => EsqlDocumentBase.load());

export function naturalLanguageToEsql<TToolOptions extends ToolOptions>({
  client,
  connectorId,
  tools,
  toolChoice,
  logger,
  functionCalling,
  ...rest
}: NlToEsqlTaskParams<TToolOptions>): Observable<NlToEsqlTaskEvent<TToolOptions>> {
  const output$ = new Subject<NlToEsqlTaskEvent<TToolOptions>>();

  const baseOptions: ActionsOptionsBase = {
    client,
    connectorId,
    functionCalling,
    logger,
    output$,
  };

  loadDocBase()
    .then(async (docBase) => {
      const messages: Message[] =
        'input' in rest ? [{ role: MessageRole.User, content: rest.input }] : rest.messages;

      const summarizeDiscussion = summarizeDiscussionFn({
        ...baseOptions,
      });

      const requestDocumentation = requestDocumentationFn({
        ...baseOptions,
        docBase,
        system: docBase.getSystemMessage(),
      });

      const generateEsql = generateEsqlTask({
        ...baseOptions,
        systemMessage: docBase.getSystemMessage(),
      });

      const reviewEsqlGeneration = reviewEsqlGenerationFn({
        ...baseOptions,
      });

      const correctEsqlGeneration = correctEsqlGenerationFn({
        ...baseOptions,
      });

      //// actual workflow

      const discussionSummary = await summarizeDiscussion({ messages });

      console.log('discussion summary:', discussionSummary);

      const documentationRequest = await requestDocumentation({
        messages: discussionFromSummary(discussionSummary.summary),
      });

      console.log('**** requested keywords:', documentationRequest.keywords);

      const generated = await generateEsql({
        documentationRequest,
        messages: discussionFromSummary(discussionSummary.summary),
      });

      console.log('**** generated:', generated);

      const review = await reviewEsqlGeneration({
        messageWithQuery: generated.content,
      });

      if (review.hasErrors) {
        console.log('**** review:', JSON.stringify(review));

        const correctedAnswer = await correctEsqlGeneration({
          documentation: documentationRequest.requestedDocumentation,
          messages: discussionFromSummary(discussionSummary.summary),
          generatedQuery: generated.content,
          review: JSON.stringify(review.queries), // TODO: fix
        });

        console.log('**** corrected answer:', correctedAnswer);
      }

      // TODO

      // TODO: correctEsqlMistakes

      output$.complete();
    })
    .catch((err) => {
      // TODO: throw inference error
      output$.error(err);
    });

  return output$.asObservable();
}

const discussionFromSummary = (summary: string): Message[] => {
  return [{ role: MessageRole.User, content: summary }];
};
