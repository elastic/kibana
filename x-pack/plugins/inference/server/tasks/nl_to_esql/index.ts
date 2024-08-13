/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { isEmpty, mapValues, pick } from 'lodash';
import { Observable, from, map, merge, of, switchMap } from 'rxjs';
import { isChatCompletionMessageEvent } from '../../../common';
import {
  ChatCompletionChunkEvent,
  ChatCompletionMessageEvent,
  MessageRole,
} from '../../../common/chat_complete';
import { ToolChoiceType, type ToolOptions } from '../../../common/chat_complete/tools';
import { OutputCompleteEvent } from '../../../common/output';
import { withoutOutputUpdateEvents } from '../../../common/output/without_output_update_events';
import { INLINE_ESQL_QUERY_REGEX } from '../../../common/tasks/nl_to_esql/constants';
import { correctCommonEsqlMistakes } from '../../../common/tasks/nl_to_esql/correct_common_esql_mistakes';
import type { InferenceClient } from '../../types';
import { loadDocuments } from './load_documents';
import { withoutTokenCountEvents } from '../../../common/chat_complete/without_token_count_events';

export function naturalLanguageToEsql<TToolOptions extends ToolOptions>({
  client,
  input,
  connectorId,
  tools,
  toolChoice,
  logger,
}: {
  client: Pick<InferenceClient, 'output' | 'chatComplete'>;
  input: string;
  connectorId: string;
  logger: Pick<Logger, 'debug'>;
} & TToolOptions): Observable<
  | OutputCompleteEvent<'request_documentation', {}>
  | ChatCompletionChunkEvent
  | ChatCompletionMessageEvent<TToolOptions>
> {
  const hasTools = !isEmpty(tools) && toolChoice !== ToolChoiceType.none;

  return from(loadDocuments()).pipe(
    switchMap(([systemMessage, esqlDocs]) => {
      return client
        .output('request_documentation', {
          connectorId,
          system: systemMessage,
          input: `Based on the following input, request documentation
        from the ES|QL handbook to help you get the right information
        needed to generate a query. 

        Examples for functions and commands:
        Do you need to group data? Request \`STATS\`.
        Extract data? Request \`DISSECT\` AND \`GROK\`.
        Convert a column based on a set of conditionals? Request \`EVAL\` and \`CASE\`.

        ${
          hasTools
            ? `### Tools

        Some tools are available to be called in the next step, but not this one.

        \`\`\`json
        ${JSON.stringify({
          tools,
          toolChoice,
        })}
        \`\`\``
            : ''
        }

        ## Input

        ${input}

      `,
          schema: {
            type: 'object',
            properties: {
              commands: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description:
                  'ES|QL source and processing commands you want to analyze before generating the query.',
              },
              functions: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'ES|QL functions you want to analyze before generating the query.',
              },
            },
          },
        } as const)
        .pipe(
          withoutOutputUpdateEvents(),
          switchMap((documentationEvent) => {
            const keywords = [
              ...(documentationEvent.output.commands ?? []),
              ...(documentationEvent.output.functions ?? []),
              'SYNTAX',
              'OVERVIEW',
              'OPERATORS',
            ].map((keyword) => keyword.toUpperCase());

            const requestedDocumentation = mapValues(pick(esqlDocs, keywords), ({ data }) => data);

            return merge(
              of({
                ...documentationEvent,
                output: {
                  keywords,
                  requestedDocumentation,
                },
              }),
              client
                .chatComplete({
                  connectorId,
                  system: systemMessage,
                  messages: [
                    {
                      role: MessageRole.User,
                      content: `Answer using the attached documentation about ES|QL.

                      Format any ES|QL query as follows:
                      \`\`\`esql
                      <query>
                      \`\`\`

                      When generating ES|QL, you must use commands and functions for which you have requested documentation.
                      
                      DO NOT UNDER ANY CIRCUMSTANCES use commands or functions that are not a capability of ES|QL
                      as mentioned in the system message and documentation. When converting queries from one language
                      to ES|QL, make sure that the functions are available and documented in ES|QL.
                      E.g., for SPL's LEN, use LENGTH. For IF, use CASE.

                      ${
                        hasTools
                          ? `If appropriate, use one of the tools attached to answer the user.`
                          : ''
                      }

                      # Documentation

                      ${Object.values(requestedDocumentation).join('\n\n')}
                      
                      # Input
                      
                      ${input}`,
                    },
                  ],
                  toolChoice,
                  tools,
                })
                .pipe(
                  withoutTokenCountEvents(),
                  map((generateEvent) => {
                    if (isChatCompletionMessageEvent(generateEvent)) {
                      const correctedContent = generateEvent.content?.replaceAll(
                        INLINE_ESQL_QUERY_REGEX,
                        (_match, query) => {
                          const correction = correctCommonEsqlMistakes(query);
                          if (correction.isCorrection) {
                            logger.debug(
                              `Corrected query, from: \n${correction.input}\nto:\n${correction.output}`
                            );
                          }
                          return '```esql\n' + correction.output + '\n```';
                        }
                      );

                      return {
                        ...generateEvent,
                        content: correctedContent,
                      };
                    }

                    return generateEvent;
                  })
                )
            );
          })
        );
    })
  );
}
