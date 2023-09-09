/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateChatCompletionResponse } from 'openai';
import { Serializable } from '@kbn/utility-types';
import { last } from 'lodash';
import { FunctionVisibility, MessageRole, RegisterFunctionDefinition } from '../../common/types';
import type { ObservabilityAIAssistantService } from '../types';

export function registerQueryFunction({
  service,
  registerFunction,
}: {
  service: ObservabilityAIAssistantService;
  registerFunction: RegisterFunctionDefinition;
}) {
  registerFunction(
    {
      name: 'execute_query',
      contexts: ['core'],
      description: 'This function executes an ES|QL query on behalf of the user',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          query: {
            type: 'string',
            description: 'The ES|QL function to execute',
          },
        },
        required: ['query'],
      } as const,
    },
    ({ arguments: { query } }, signal) => {
      return service
        .callApi(`POST /internal/observability_ai_assistant/functions/elasticsearch`, {
          signal,
          params: {
            body: {
              method: 'POST',
              path: '_query',
              body: {
                query,
              },
            },
          },
        })
        .then((response) => ({ content: response as Serializable }));
    }
  );

  registerFunction(
    {
      name: 'show_query',
      contexts: ['core'],
      description: `This function calls out to an external service to generate an ES|QL query based on the other\'s user request. It returns the query itself, it does not execute it. Explain the returned query step-by-step. Display the query as a Markdown code block with the language being "esql".`,
      visibility: FunctionVisibility.System,
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          show: {
            type: 'boolean',
          },
        },
      } as const,
    },
    ({ messages, connectorId }, signal) => {
      const systemMessage = `You are a helpful assistant for Elastic ES|QL. Your goal is to help the user construct and possibly execute an ES|QL query.
        
        Additionally, SQL statements are NOT supported by ES|QL. ES|QL is a completely different language. Forget everything you have learned
        about SQL. Use only the context of the conversation to construct a query. Pay special attention to syntax, escaping and arguments.

        In every response that covers ES|QL, reason about whether the query you have created adheres to the rules and the documentation
        you have found. Mention the documentation and the rules in your reasoning, before building the query. 
        
        When creating a query, first, mention the information from the rules below, and the documentation that is included, in your response.

        - only string literals should be escaped with quotes. correct: \`FROM employees*\`, incorrect: \`FROM "employees"\`, correct: \`ROW a = "my-first-string my-second-string"\`
        - \`COUNT\` requires a single argument. correct: \`COUNT(field-name)\`, incorrect: \`COUNT(*)\`, incorrect: \`COUNT()\`
        - field names as arguments are not escaped (correct: \`COUNT(@timestamp)\`, incorrect: \`COUNT("@timestamp")\`
        - aliasing happens with the \`=\` operator, not the \`AS\` keyword. correct: \`STATS doc_count = COUNT(field-name)\`, \`EVAL year = DATE_TRUNC(release_date, 1 YEARS)\`, incorrect: \`STATS = COUNT(field-name) AS doc_count\`
        - avoid reserved words as variable names (correct: \`STATS doc_count = COUNT(field-name)\`, incorrect: \`STATS count = COUNT(field-name))\`

        Then, add a separator: ####

        Then, add the query, with no additional text.

        Format:

        <reasoning>

        ####

        <query>
      `;

      return service
        .callApi('POST /internal/observability_ai_assistant/chat', {
          signal,
          params: {
            query: {
              stream: false,
            },
            body: {
              connectorId,
              functions: [],
              messages: [
                {
                  '@timestamp': new Date().toISOString(),
                  message: { role: MessageRole.System, content: systemMessage },
                },
                ...messages.slice(1),
              ],
            },
          },
        })
        .then((value) => {
          const response = value as CreateChatCompletionResponse;
          const parsed = last(response.choices[0].message!.content!.split('####'))!.trim();

          return { content: { query: parsed } };
        });
    }
  );
}
