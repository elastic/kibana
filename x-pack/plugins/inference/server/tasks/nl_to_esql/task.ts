/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'lodash';
import { Observable, from, switchMap } from 'rxjs';
import { Message, MessageRole } from '../../../common/chat_complete';
import type { ToolOptions } from '../../../common/chat_complete/tools';
import { EsqlDocumentBase } from './doc_base';
import { requestDocumentation, generateEsqlTask } from './actions';
import { NlToEsqlTaskParams, NlToEsqlTaskEvent } from './types';

const loadDocBase = once(() => EsqlDocumentBase.load());

export function naturalLanguageToEsql<TToolOptions extends ToolOptions>({
  client,
  connectorId,
  tools,
  toolChoice,
  logger,
  ...rest
}: NlToEsqlTaskParams<TToolOptions>): Observable<NlToEsqlTaskEvent<TToolOptions>> {
  return from(loadDocBase()).pipe(
    switchMap((docBase) => {
      const systemMessage = docBase.getSystemMessage();
      const messages: Message[] =
        'input' in rest ? [{ role: MessageRole.User, content: rest.input }] : rest.messages;

      const askLlmToRespond = generateEsqlTask({
        connectorId,
        chatCompleteApi: client.chatComplete,
        messages,
        docBase,
        logger,
        systemMessage,
        toolOptions: {
          tools,
          toolChoice,
        },
      });

      return requestDocumentation({
        connectorId,
        outputApi: client.output,
        messages,
        system: systemMessage,
        toolOptions: {
          tools,
          toolChoice,
        },
      }).pipe(
        switchMap((documentationEvent) => {
          return askLlmToRespond({
            documentationRequest: {
              commands: documentationEvent.output.commands,
              functions: documentationEvent.output.functions,
            },
          });
        })
      );
    })
  );
}
