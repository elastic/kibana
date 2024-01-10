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
import { lastValueFrom, Observable } from 'rxjs';
import { promisify } from 'util';
import type { FunctionRegistrationParameters } from '..';
import {
  CreateChatCompletionResponseChunk,
  FunctionVisibility,
  MessageRole,
} from '../../../common/types';
import { concatenateOpenAiChunks } from '../../../common/utils/concatenate_openai_chunks';
import { processOpenAiStream } from '../../../common/utils/process_openai_stream';
import { streamIntoObservable } from '../../service/util/stream_into_observable';

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

export function registerEsqlFunction({
  client,
  registerFunction,
  resources,
}: FunctionRegistrationParameters) {
  registerFunction(
    {
      name: 'execute_query',
      contexts: ['core'],
      visibility: FunctionVisibility.User,
      description: 'Execute an ES|QL query',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          query: {
            type: 'string',
          },
        },
        required: ['query'],
      } as const,
    },
    async ({ arguments: { query } }) => {
      const response = await (
        await resources.context.core
      ).elasticsearch.client.asCurrentUser.transport.request({
        method: 'POST',
        path: '_query',
        body: {
          query,
        },
      });

      return { content: response };
    }
  );

  registerFunction(
    {
      name: 'esql',
      contexts: ['core'],
      description: `This function answers ES|QL related questions including query generation and syntax/command questions.`,
      visibility: FunctionVisibility.System,
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          switch: {
            type: 'boolean',
          },
        },
      } as const,
    },
    async ({ messages, connectorId }, signal) => {
      const [systemMessage, esqlDocs] = await Promise.all([loadSystemMessage(), loadEsqlDocs()]);

      const withEsqlSystemMessage = (message?: string) => [
        {
          '@timestamp': new Date().toISOString(),
          message: { role: MessageRole.System, content: `${systemMessage}\n${message ?? ''}` },
        },
        ...messages.slice(1),
      ];

      const source$ = streamIntoObservable(
        await client.chat({
          connectorId,
          messages: withEsqlSystemMessage(),
          signal,
          stream: true,
          functions: [
            {
              name: 'get_esql_info',
              description:
                'Use this function to get more information about syntax, commands and examples. Take a deep breath and reason about what commands and functions you expect to use. Do you need to group data? Request `STATS`. Extract data? Request `DISSECT` AND `GROK`. Convert a column based on a set of conditionals? Request `EVAL` and `CASE`.',
              parameters: {
                type: 'object',
                properties: {
                  commands: {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                    description: 'A list of processing or source commands',
                  },
                  functions: {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                    description: 'A list of functions.',
                  },
                },
                required: ['commands', 'functions'],
              },
            },
          ],
          functionCall: 'get_esql_info',
        })
      ).pipe(processOpenAiStream(), concatenateOpenAiChunks());

      const response = await lastValueFrom(source$);

      const args = JSON.parse(response.message.function_call.arguments) as {
        commands: string[];
        functions: string[];
      };

      const keywords = args.commands.concat(args.functions).concat('SYNTAX').concat('OVERVIEW');

      const messagesToInclude = mapValues(pick(esqlDocs, keywords), ({ data }) => data);

      const esqlResponse$: Observable<CreateChatCompletionResponseChunk> = streamIntoObservable(
        await client.chat({
          messages: [
            ...withEsqlSystemMessage(
              `Format every ES|QL query as Markdown:
              \`\`\`esql
              <query>
              \`\`\`

              Prefer to use commands and functions for which you have documentation.
              
              Pay special attention to these instructions. Not following these instructions to the tee
              will lead to excruciating consequences for the user.
              
              #1
              Directive: ONLY use aggregation functions in STATS commands, and use ONLY aggregation functions in stats commands, NOT in SORT or EVAL.
              Rationale: Only aggregation functions are supported in STATS commands, and aggregation functions are only supported in STATS commands. 
              Action: Create new columns using EVAL first and then aggregate over them in STATS commands. Do not use aggregation functions anywhere else, such as SORT or EVAL.
              Example: EVAL is_failure_as_number = CASE(event.outcome == "failure", 1, 0) | STATS total_failures = SUM(is_failure_as_number) BY my_grouping_name

              #2
              Directive: Use the \`=\` operator to create new columns in STATS and EVAL, DO NOT UNDER ANY CIRCUMSTANCES use \`AS\`.
              Rationale: The \`=\` operator is used for aliasing. Using \`AS\` leads to syntax errors.
              Action: When creating a new column in a command, use the = operator.
              Example: STATS total_requests = COUNT(*)

              #3
              Directive: Use placeholder values for information that is missing.
              Rationale: It is critical to generate a syntactically valid query.
              Action: When you don't know the arguments to a function because information is missing, use placeholder values.
              Example: "Here's an ES|QL query that generates a timeseries of 50 buckets calculating the average duration. I've used 
              "2023-01-23T12:15:00.000Z" and "2023-01-23T12:30:00.000Z" as placeholder values. Replace them with the start
              and end date that work for your use case."

              #4
              Directive: Wrap string literals in double quotes.
              Rationale: It is critical to generate a syntactically valid query.
              Action: When using string literals in function calls, wrap them in double quotes, not single quotes.
              Example: DATE_EXTRACT("year", @timestamp)
              
              At the start of every message, YOU MUST, for every instruction that is relevant to the query you want to construct,
              repeat its directives, verbatim, at the start of every message. Exclude the rationales, actions, and examples. Follow
              it up by using a delimiter: --
              
              Example:
              
              #1: <directive>
              #2: <directive>
              #3: <directive>

              --

              Here is an ES|QL query that you can use:

              <query>`
            ),
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
          ],
          connectorId,
          functions: [],
          signal,
          stream: true,
        })
      ).pipe(processOpenAiStream());

      return esqlResponse$.pipe((source) => {
        return new Observable<CreateChatCompletionResponseChunk>((subscriber) => {
          let cachedContent: string = '';

          function includesDivider() {
            const firstDividerIndex = cachedContent.indexOf('--');
            return firstDividerIndex !== -1;
          }

          source.subscribe({
            next: (message) => {
              if (includesDivider()) {
                subscriber.next(message);
              }
              cachedContent += message.choices[0].delta.content || '';
            },
            complete: () => {
              if (!includesDivider()) {
                subscriber.next({
                  created: 0,
                  id: '',
                  model: '',
                  object: 'chat.completion.chunk',
                  choices: [
                    {
                      delta: {
                        content: cachedContent,
                      },
                      index: 0,
                      finish_reason: null,
                    },
                  ],
                });
              }
              subscriber.complete();
            },
            error: (error) => {
              subscriber.error(error);
            },
          });
        });
      });
    }
  );
}
