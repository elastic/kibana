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
  const dir = Path.join(__dirname, './docs');
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
              `
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
                  commonMistakes: `
                    What follows are patterns of common mistakes and their corrections.
                    DO NOT UNDER ANY CIRCUMSTANCES repeat these mistakes.

                    // aggregation functions do not support other functions
                    mistake: | STATS failures = SUM(CASE(event.outcome == "failure", 1, 0)) BY my_grouping_name
                    correction: | EVAL is_failure_as_number = CASE(event.outcome == "failure", 1, 0) | STATS total_failures = SUM(is_failure_as_number) BY my_grouping_name
                    // STATS ... BY does not support arithmetic operations
                    mistake: | STATS failure_rate = SUM(is_failure) / SUM(is_success_or_failure)
                    correction: | STATS total_failures = SUM(is_failure), total_successes_or_failures = SUM(is_success_or_failure) | EVAL failure_rate = total_failures / total_successes_or_failures | DROP total_failures, total_successes_or_failures

                    // aliasing happens with the = operator, not the AS keyword.
                    // DO NOT UNDER ANY CIRCUMSTANCES use the AS keyword
                    mistake: | STATS COUNT(*) AS total_requests 
                    mistake: | STATS SUM(request_latency) AS total_duration
                    correction: | STATS total_requests = COUNT(*)

                    // AUTO_BUCKET requires four arguments
                    mistake: | EVAL bucket = AUTO_BUCKET(@timestamp, 50)
                    correction: | EVAL bucket = AUTO_BUCKET(@timestamp, 50, <start-date>, <end-date>)
                    correction: | EVAL bucket = AUTO_BUCKET(@timestamp, 50, "2023-01-23T12:15:00.000Z", "2023-01-23T12:30:00.000Z")`,
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

      return esqlResponse$;
    }
  );
}
