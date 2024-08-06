/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { switchMap, map } from 'rxjs';
import { MessageRole } from '../../../common/chat_complete';
import { ToolOptions } from '../../../common/chat_complete/tools';
import { withoutChunkEvents } from '../../../common/chat_complete/without_chunk_events';
import { withoutTokenCountEvents } from '../../../common/chat_complete/without_token_count_events';
import { createOutputCompleteEvent } from '../../../common/output';
import { withoutOutputUpdateEvents } from '../../../common/output/without_output_update_events';
import { InferenceClient } from '../../types';

const ESQL_SYSTEM_MESSAGE = '';

async function getEsqlDocuments(documents: string[]) {
  return [
    {
      document: 'my-esql-function',
      text: 'My ES|QL function',
    },
  ];
}

export function naturalLanguageToEsql<TToolOptions extends ToolOptions>({
  client,
  input,
  connectorId,
  tools,
  toolChoice,
}: {
  client: InferenceClient;
  input: string;
  connectorId: string;
} & TToolOptions) {
  return client
    .output('request_documentation', {
      connectorId,
      system: ESQL_SYSTEM_MESSAGE,
      input: `Based on the following input, request documentation
        from the ES|QL handbook to help you get the right information
        needed to generate a query:
        ${input}
      `,
      schema: {
        type: 'object',
        properties: {
          documents: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
        required: ['documents'],
      } as const,
    })
    .pipe(
      withoutOutputUpdateEvents(),
      switchMap((event) => {
        return getEsqlDocuments(event.output.documents ?? []);
      }),
      switchMap((documents) => {
        return client
          .chatComplete({
            connectorId,
            system: `${ESQL_SYSTEM_MESSAGE}
          
          The following documentation is provided:

          ${documents}`,
            messages: [
              {
                role: MessageRole.User,
                content: input,
              },
            ],
            tools,
            toolChoice,
          })
          .pipe(
            withoutTokenCountEvents(),
            withoutChunkEvents(),
            map((message) => {
              return createOutputCompleteEvent('generated_query', {
                content: message.content,
                toolCalls: message.toolCalls,
              });
            })
          );
      }),
      withoutOutputUpdateEvents()
    );
}
