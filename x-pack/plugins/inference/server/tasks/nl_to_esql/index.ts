/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { isEmpty, mapValues, pick } from 'lodash';
import { Observable, from, map, merge, of, switchMap } from 'rxjs';
import { v4 } from 'uuid';
import { isChatCompletionMessageEvent } from '../../../common';
import {
  ChatCompletionChunkEvent,
  ChatCompletionMessageEvent,
  Message,
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
  connectorId,
  tools,
  toolChoice,
  logger,
  ...rest
}: {
  client: Pick<InferenceClient, 'output' | 'chatComplete'>;
  connectorId: string;
  logger: Pick<Logger, 'debug'>;
} & TToolOptions &
  ({ input: string } | { messages: Message[] })): Observable<
  | OutputCompleteEvent<'request_documentation', {}>
  | ChatCompletionChunkEvent
  | ChatCompletionMessageEvent<TToolOptions>
> {
  const hasTools = !isEmpty(tools) && toolChoice !== ToolChoiceType.none;

  const messages: Message[] =
    'input' in rest ? [{ role: MessageRole.User, content: rest.input }] : rest.messages;

  return from(loadDocuments()).pipe(
    switchMap(([systemMessage, esqlDocs]) => {
      return client
        .output('request_documentation', {
          connectorId,
          system: systemMessage,
          input: `Based on the following conversation, request documentation
        from the ES|QL handbook to help you get the right information
        needed to generate a query. 

        Examples for functions and commands:
        Do you need to group data? Request \`STATS\`.
        Extract data? Request \`DISSECT\` AND \`GROK\`.
        Convert a column based on a set of conditionals? Request \`EVAL\` and \`CASE\`.

        ${
          hasTools
            ? `### Tools

        The following tools will be available to be called in the step after this.

        \`\`\`json
        ${JSON.stringify({
          tools,
          toolChoice,
        })}
        \`\`\``
            : ''
        }

        ## Conversation

        What follows is the conversation that the user is having with the system.
        
        \`\`\`json
        ${JSON.stringify(messages)}
        \`\`\`

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
              ...(hasTools
                ? {
                    toolUseCandidates: {
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: Object.keys(tools ?? {}),
                      },
                      description: "Possible tools you could use to answer the user's question",
                    },
                  }
                : {}),
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

            const fakeRequestDocsToolCall = {
              function: {
                name: 'request_documentation',
                arguments: documentationEvent.output,
              },
              toolCallId: v4().substring(0, 6),
            };

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
                  system: `${systemMessage}

                  # Current task

                  Your current task is to respond to the user's question. If there is a tool
                  suitable for answering the user's question, use that tool, preferably
                  with a natural language reply included.

                  Format any ES|QL query as follows:
                  \`\`\`esql
                  <query>
                  \`\`\`

                  When generating ES|QL, you must use commands and functions for which you 
                  requested documentation.
                  
                  DO NOT UNDER ANY CIRCUMSTANCES use commands or functions that are not a capability
                  of ES|QL as mentioned in the system message and documentation. When converting
                  queries from one language to ES|QL, make sure that the functions are available
                  and documented in ES|QL. E.g., for SPL's LEN, use LENGTH. For IF, use CASE.`,
                  messages: messages.concat([
                    {
                      role: MessageRole.Assistant,
                      content: null,
                      toolCalls: [fakeRequestDocsToolCall],
                    },
                    {
                      role: MessageRole.Tool,
                      response: {
                        documentation: requestedDocumentation,
                      },
                      toolCallId: fakeRequestDocsToolCall.toolCallId,
                    },
                  ]),
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
