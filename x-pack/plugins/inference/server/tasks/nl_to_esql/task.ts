/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'lodash';
import { Observable, Subject } from 'rxjs';
import { Message, MessageRole } from '../../../common/chat_complete';
import type { ToolOptions } from '../../../common/chat_complete/tools';
import { EsqlDocumentBase } from './doc_base';
import {
  type ActionsOptionsBase,
  generateEsqlTaskFn,
  requestDocumentationFn,
  summarizeDiscussionFn,
} from './actions';
import { NlToEsqlTaskEvent, NlToEsqlTaskParams } from './types';

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
      const generateEsql = generateEsqlTaskFn({
        ...baseOptions,
        systemMessage: docBase.getSystemMessage(),
      });

      //// actual workflow

      const discussionSummary = await summarizeDiscussion({ messages });

      console.log('discussion summary:', discussionSummary);

      const documentationRequest = await requestDocumentation({
        messages: discussionFromSummary(discussionSummary.summary),
      });

      console.log('**** requested keywords:', documentationRequest.keywords);

      await generateEsql({
        documentationRequest,
        messages: discussionFromSummary(discussionSummary.summary),
      });

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
