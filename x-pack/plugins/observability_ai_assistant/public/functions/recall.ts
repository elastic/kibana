/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Serializable } from '@kbn/utility-types';
import { omit } from 'lodash';
import { MessageRole, RegisterFunctionDefinition } from '../../common/types';
import type { ObservabilityAIAssistantService } from '../types';

export function registerRecallFunction({
  service,
  registerFunction,
}: {
  service: ObservabilityAIAssistantService;
  registerFunction: RegisterFunctionDefinition;
}) {
  registerFunction(
    {
      name: 'recall',
      contexts: ['core'],
      description: `Use this function to recall earlier learnings. Anything you will summarize can be retrieved again later via this function.
      
      The learnings are sorted by score, descending.
      
      Make sure the query covers ONLY the following aspects:
      - Anything you've inferred from the user's request, but is not mentioned in the user's request
      - The functions you think might be suitable for answering the user's request. If there are multiple functions that seem suitable, create multiple queries. Use the function name in the query.  

      DO NOT include the user's request. It will be added internally.
      
      The user asks: "can you visualise the average request duration for opbeans-go over the last 7 days?"
      You recall: {
        "queries": [
          "APM service,
          "lens function usage",
          "get_apm_timeseries function usage"    
        ],
        "contexts": [
          "lens",
          "apm"
        ]
      }`,
      descriptionForUser: 'This function allows the assistant to recall previous learnings.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          queries: {
            type: 'array',
            additionalItems: false,
            additionalProperties: false,
            description: 'The query for the semantic search',
            items: {
              type: 'string',
            },
          },
          contexts: {
            type: 'array',
            additionalItems: false,
            additionalProperties: false,
            description:
              'Contexts or categories of internal documentation that you want to search for. By default internal documentation will be excluded. Use `apm` to get internal APM documentation, `lens` to get internal Lens documentation, or both.',
            items: {
              type: 'string',
              enum: ['apm', 'lens'],
            },
          },
        },
        required: ['queries', 'contexts'],
      } as const,
    },
    ({ arguments: { queries, contexts }, messages }, signal) => {
      const userMessages = messages.filter((message) => message.message.role === MessageRole.User);

      const userPrompt = userMessages[userMessages.length - 1]?.message.content;

      const queriesWithUserPrompt = userPrompt ? [userPrompt, ...queries] : queries;

      return service
        .callApi('POST /internal/observability_ai_assistant/functions/recall', {
          params: {
            body: {
              queries: queriesWithUserPrompt,
              contexts,
            },
          },
          signal,
        })
        .then((response): { content: Serializable } => ({
          content: response.entries.map((entry) =>
            omit(entry, 'labels', 'score', 'is_correction')
          ) as unknown as Serializable,
        }));
    }
  );
}
