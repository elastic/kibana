/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import { keyBy, mapValues, once, pick } from 'lodash';
import pLimit from 'p-limit';
import Path from 'path';
import { lastValueFrom, startWith } from 'rxjs';
import { promisify } from 'util';
import { FunctionVisibility, MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import {
  VisualizeESQLUserIntention,
  VISUALIZE_ESQL_USER_INTENTIONS,
} from '@kbn/observability-ai-assistant-plugin/common/functions/visualize_esql';
import {
  concatenateChatCompletionChunks,
  ConcatenatedMessage,
} from '@kbn/observability-ai-assistant-plugin/common/utils/concatenate_chat_completion_chunks';
import { emitWithConcatenatedMessage } from '@kbn/observability-ai-assistant-plugin/common/utils/emit_with_concatenated_message';
import { createFunctionResponseMessage } from '@kbn/observability-ai-assistant-plugin/common/utils/create_function_response_message';
import type { FunctionRegistrationParameters } from '..';
import { correctCommonEsqlMistakes } from './correct_common_esql_mistakes';
import { runAndValidateEsqlQuery } from './validate_esql_query';
import { INLINE_ESQL_QUERY_REGEX } from './constants';

export const QUERY_FUNCTION_NAME = 'query';
export const EXECUTE_QUERY_NAME = 'execute_query';

const readFile = promisify(Fs.readFile);
const readdir = promisify(Fs.readdir);

const loadSystemMessage = once(async () => {
  const data = await readFile(Path.join(__dirname, './system_message.txt'));
  return data.toString('utf-8');
});

const loadEsqlDocs = once(async () => {
  const dir = Path.join(__dirname, './esql_docs');
  const files = (await readdir(dir)).filter((file) => Path.extname(file) === '.txt');

  if (!files.length) {
    return {};
  }

  const limiter = pLimit(10);
  return keyBy(
    await Promise.all(
      files.map((file) =>
        limiter(async () => {
          const data = (await readFile(Path.join(dir, file))).toString('utf-8');
          const filename = Path.basename(file, '.txt');

          const keyword = filename
            .replace('esql-', '')
            .replace('agg-', '')
            .replaceAll('-', '_')
            .toUpperCase();

          return {
            keyword: keyword === 'STATS_BY' ? 'STATS' : keyword,
            data,
          };
        })
      )
    ),
    'keyword'
  );
});

export function registerQueryFunction({ functions, resources }: FunctionRegistrationParameters) {
  functions.registerInstruction(({ availableFunctionNames }) =>
    availableFunctionNames.includes(QUERY_FUNCTION_NAME)
      ? `You MUST use the "${QUERY_FUNCTION_NAME}" function when the user wants to:
  - visualize data
  - run any arbitrary query
  - breakdown or filter ES|QL queries that are displayed on the current page
  - convert queries from another language to ES|QL
  - asks general questions about ES|QL

  DO NOT UNDER ANY CIRCUMSTANCES generate ES|QL queries or explain anything about the ES|QL query language yourself.
  DO NOT UNDER ANY CIRCUMSTANCES try to correct an ES|QL query yourself - always use the "${QUERY_FUNCTION_NAME}" function for this.

  If the user asks for a query, and one of the dataset info functions was called and returned no results, you should still call the query function to generate an example query.

  Even if the "${QUERY_FUNCTION_NAME}" function was used before that, follow it up with the "${QUERY_FUNCTION_NAME}" function. If a query fails, do not attempt to correct it yourself. Again you should call the "${QUERY_FUNCTION_NAME}" function,
  even if it has been called before.

  When the "visualize_query" function has been called, a visualization has been displayed to the user. DO NOT UNDER ANY CIRCUMSTANCES follow up a "visualize_query" function call with your own visualization attempt.
  If the "${EXECUTE_QUERY_NAME}" function has been called, summarize these results for the user. The user does not see a visualization in this case.`
      : undefined
  );

  functions.registerFunction(
    {
      name: EXECUTE_QUERY_NAME,
      visibility: FunctionVisibility.UserOnly,
      description: 'Display the results of an ES|QL query.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
          },
        },
        required: ['query'],
      } as const,
    },
    async ({ arguments: { query } }) => {
      const client = (await resources.context.core).elasticsearch.client.asCurrentUser;
      const { error, errorMessages, rows, columns } = await runAndValidateEsqlQuery({
        query,
        client,
      });

      if (!!error) {
        return {
          content: {
            message: 'The query failed to execute',
            error,
            errorMessages,
          },
        };
      }

      return {
        content: {
          columns,
          rows,
        },
      };
    }
  );
  functions.registerFunction(
    {
      name: QUERY_FUNCTION_NAME,
      description: `This function generates, executes and/or visualizes a query based on the user's request. It also explains how ES|QL works and how to convert queries from one language to another. Make sure you call one of the get_dataset functions first if you need index or field names. This function takes no input.`,
      visibility: FunctionVisibility.AssistantOnly,
    },
    async ({ messages, chat }, signal) => {
      const [systemMessage, esqlDocs] = await Promise.all([loadSystemMessage(), loadEsqlDocs()]);

      const withEsqlSystemMessage = (message?: string) => [
        {
          '@timestamp': new Date().toISOString(),
          message: { role: MessageRole.System, content: `${systemMessage}\n${message ?? ''}` },
        },
        // remove the query function request
        ...messages.filter((msg) => msg.message.role !== MessageRole.System),
      ];

      const userQuestion = messages
        .concat()
        .reverse()
        .find((message) => message.message.role === MessageRole.User && !message.message.name);

      const abbreviatedUserQuestion = userQuestion!.message.content!.substring(0, 50);

      const source$ = (
        await chat('classify_esql', {
          messages: withEsqlSystemMessage().concat(
            createFunctionResponseMessage({
              name: QUERY_FUNCTION_NAME,
              content: {},
            }).message,
            {
              '@timestamp': new Date().toISOString(),
              message: {
                role: MessageRole.User,
                content: `Use the classify_esql tool attached to this conversation
              to classify the user's request in the user message before this ("${abbreviatedUserQuestion}...").
              and get more information about specific functions and commands
              you think are candidates for answering the question.

              Examples for functions and commands:
              Do you need to group data? Request \`STATS\`.
              Extract data? Request \`DISSECT\` AND \`GROK\`.
              Convert a column based on a set of conditionals? Request \`EVAL\` and \`CASE\`.

              ONLY use ${VisualizeESQLUserIntention.executeAndReturnResults} if you are absolutely sure
              it is executable. If one of the get_dataset_info functions were not called before, OR if
              one of the get_dataset_info functions returned no data, opt for an explanation only and
              mention that there is no data for these indices. You can still use
              ${VisualizeESQLUserIntention.generateQueryOnly} and generate an example ES|QL query.

              For determining the intention of the user, the following options are available:

              ${VisualizeESQLUserIntention.generateQueryOnly}: the user only wants to generate the query,
              but not run it, or they ask a general question about ES|QL.

              ${VisualizeESQLUserIntention.executeAndReturnResults}: the user wants to execute the query,
              and have the assistant return/analyze/summarize the results. they don't need a
              visualization.

              ${VisualizeESQLUserIntention.visualizeAuto}: The user wants to visualize the data from the
              query, but wants us to pick the best visualization type, or their preferred
              visualization is unclear.

              These intentions will display a specific visualization:
              ${VisualizeESQLUserIntention.visualizeBar}
              ${VisualizeESQLUserIntention.visualizeDonut}
              ${VisualizeESQLUserIntention.visualizeHeatmap}
              ${VisualizeESQLUserIntention.visualizeLine}
              ${VisualizeESQLUserIntention.visualizeArea}
              ${VisualizeESQLUserIntention.visualizeTable}
              ${VisualizeESQLUserIntention.visualizeTagcloud}
              ${VisualizeESQLUserIntention.visualizeTreemap}
              ${VisualizeESQLUserIntention.visualizeWaffle}
              ${VisualizeESQLUserIntention.visualizeXy}

              Some examples:

              "I want a query that ..." => ${VisualizeESQLUserIntention.generateQueryOnly}
              "... Just show me the query" => ${VisualizeESQLUserIntention.generateQueryOnly}
              "Create a query that ..." => ${VisualizeESQLUserIntention.generateQueryOnly}

              "Show me the avg of x" => ${VisualizeESQLUserIntention.executeAndReturnResults}
              "Show me the results of y" => ${VisualizeESQLUserIntention.executeAndReturnResults}
              "Display the sum of z" => ${VisualizeESQLUserIntention.executeAndReturnResults}

              "Show me the avg of x over time" => ${VisualizeESQLUserIntention.visualizeAuto}
              "I want a bar chart of ... " => ${VisualizeESQLUserIntention.visualizeBar}
              "I want to see a heat map of ..." => ${VisualizeESQLUserIntention.visualizeHeatmap}
              `,
              },
            }
          ),
          signal,
          functions: [
            {
              name: 'classify_esql',
              description: `Use this function to determine:
              - what ES|QL functions and commands are candidates for answering the user's question
              - whether the user has requested a query, and if so, it they want it to be executed, or just shown.

              All parameters are required. Make sure the functions and commands you request are available in the
              system message.
              `,
              parameters: {
                type: 'object',
                properties: {
                  commands: {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                    description:
                      'A list of processing or source commands that are referenced in the list of commands in this conversation',
                  },
                  functions: {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                    description:
                      'A list of functions that are referenced in the list of functions in this conversation',
                  },
                  intention: {
                    type: 'string',
                    description: `What the user\'s intention is.`,
                    enum: VISUALIZE_ESQL_USER_INTENTIONS,
                  },
                },
                required: ['commands', 'functions', 'intention'],
              },
            },
          ],
          functionCall: 'classify_esql',
        })
      ).pipe(concatenateChatCompletionChunks());

      const response = await lastValueFrom(source$);

      if (!response.message.function_call.arguments) {
        resources.logger.debug(
          () =>
            `LLM should have called "classify_esql", but instead responded with the following message: ${JSON.stringify(
              response.message
            )}`
        );
        throw new Error(
          'LLM did not call classify_esql function during query generation, execute the "query" function and try again'
        );
      }

      const args = JSON.parse(response.message.function_call.arguments) as {
        commands?: string[];
        functions?: string[];
        intention: VisualizeESQLUserIntention;
      };

      const keywords = [
        ...(args.commands ?? []),
        ...(args.functions ?? []),
        'SYNTAX',
        'OVERVIEW',
        'OPERATORS',
      ].map((keyword) => keyword.toUpperCase());

      const messagesToInclude = mapValues(pick(esqlDocs, keywords), ({ data }) => data);

      let userIntentionMessage: string;

      switch (args.intention) {
        case VisualizeESQLUserIntention.executeAndReturnResults:
          userIntentionMessage = `When you generate a query, it will automatically be executed and its results returned to you. The user does not need to do anything for this.`;
          break;

        case VisualizeESQLUserIntention.generateQueryOnly:
          userIntentionMessage = `Any generated query will not be executed automatically, the user needs to do this themselves.`;
          break;

        default:
          userIntentionMessage = `The generated query will automatically be visualized to the user, displayed below your message. The user does not need to do anything for this.`;
          break;
      }

      const queryFunctionResponseMessage = createFunctionResponseMessage({
        name: QUERY_FUNCTION_NAME,
        content: {},
        data: {
          // add the included docs for debugging
          documentation: {
            intention: args.intention,
            keywords,
            files: messagesToInclude,
          },
        },
      });

      const esqlResponse$ = await chat('answer_esql_question', {
        messages: [
          ...withEsqlSystemMessage().concat(queryFunctionResponseMessage.message),
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.Assistant,
              content: '',
              function_call: {
                name: 'get_esql_info',
                arguments: JSON.stringify(args),
                trigger: MessageRole.Assistant as const,
              },
            },
          },
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              name: 'get_esql_info',
              content: JSON.stringify({
                documentation: messagesToInclude,
              }),
            },
          },
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.Assistant,
              content: 'Thank you for providing the ES|QL info. What can I help you with?',
            },
          },
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              content: `Answer the user's question that was previously asked ("${abbreviatedUserQuestion}...") using the attached documentation. Take into account any previous errors from the \`${EXECUTE_QUERY_NAME}\` or \`visualize_query\` function.

                Format any ES|QL query as follows:
                \`\`\`esql
                <query>
                \`\`\`

                Respond in plain text. Do not attempt to use a function.

                You must use commands and functions for which you have requested documentation.

                ${
                  args.intention !== VisualizeESQLUserIntention.generateQueryOnly
                    ? `DO NOT UNDER ANY CIRCUMSTANCES generate more than a single query.
                    If multiple queries are needed, do it as a follow-up step. Make this clear to the user. For example:

                    Human: plot both yesterday's and today's data.

                    Assistant: Here's how you can plot yesterday's data:
                    \`\`\`esql
                    <query>
                    \`\`\`

                    Let's see that first. We'll look at today's data next.

                    Human: <response from yesterday's data>

                    Assistant: Let's look at today's data:

                    \`\`\`esql
                    <query>
                    \`\`\`
                    `
                    : ''
                }

                ${userIntentionMessage}

                DO NOT UNDER ANY CIRCUMSTANCES use commands or functions that are not a capability of ES|QL
                as mentioned in the system message and documentation. When converting queries from one language
                to ES|QL, make sure that the functions are available and documented in ES|QL.
                E.g., for SPL's LEN, use LENGTH. For IF, use CASE.

                `,
            },
          },
        ],
        signal,
        functions: functions.getActions(),
      });

      return esqlResponse$.pipe(
        emitWithConcatenatedMessage(async (msg) => {
          msg.message.content = msg.message.content.replaceAll(
            INLINE_ESQL_QUERY_REGEX,
            (_match, query) => {
              const correction = correctCommonEsqlMistakes(query);
              if (correction.isCorrection) {
                resources.logger.debug(
                  `Corrected query, from: \n${correction.input}\nto:\n${correction.output}`
                );
              }
              return '```esql\n' + correction.output + '\n```';
            }
          );

          if (msg.message.function_call.name) {
            return msg;
          }

          const esqlQuery = msg.message.content.match(
            new RegExp(INLINE_ESQL_QUERY_REGEX, 'ms')
          )?.[1];

          let functionCall: ConcatenatedMessage['message']['function_call'] | undefined;

          if (
            !args.intention ||
            !esqlQuery ||
            args.intention === VisualizeESQLUserIntention.generateQueryOnly
          ) {
            functionCall = undefined;
          } else if (args.intention === VisualizeESQLUserIntention.executeAndReturnResults) {
            functionCall = {
              name: EXECUTE_QUERY_NAME,
              arguments: JSON.stringify({ query: esqlQuery }),
              trigger: MessageRole.Assistant as const,
            };
          } else {
            functionCall = {
              name: 'visualize_query',
              arguments: JSON.stringify({ query: esqlQuery, intention: args.intention }),
              trigger: MessageRole.Assistant as const,
            };
          }

          return {
            ...msg,
            message: {
              ...msg.message,
              ...(functionCall
                ? {
                    function_call: functionCall,
                  }
                : {}),
            },
          };
        }),
        startWith(queryFunctionResponseMessage)
      );
    }
  );
}
