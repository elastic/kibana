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
  summarizeInput = false,
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
      let messages: Message[] =
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

      if (summarizeInput) {
        const discussionSummary = await summarizeDiscussion({ messages });
        messages = discussionFromSummary(discussionSummary.summary);
      }

      const documentationRequest = await requestDocumentation({
        messages,
      });

      await generateEsql({
        documentationRequest,
        messages,
      });

      output$.complete();
    })
    .catch((err) => {
      output$.error(err);
    });

  return output$.asObservable();
}

const discussionFromSummary = (summary: string): Message[] => {
  return [{ role: MessageRole.User, content: summary }];
};
