/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Serializable } from '@kbn/utility-types';
import type { RegisterFunctionDefinition } from '../../common/types';
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
      description: `Use this function to recall earlier learnings. Anything you will summarise can be retrieved again later via this function. This is semantic/vector search so there's no need for an exact match.
      
      Make sure the query covers the following aspects:
      - The user's prompt, verbatim
      - Anything you've inferred from the user's request, but is not mentioned in the user's request
      - The functions you think might be suitable for answering the user's request. If there are multiple functions that seem suitable, create multiple queries. Use the function name in the query.  
      
      Q: "can you visualise the average request duration for opbeans-go over the last 7 days?"
      A: -"can you visualise the average request duration for opbeans-go over the last 7 days?"
      - "APM service"
      - "lens function usage"
      - "get_apm_timeseries function usage"
      
      Q: "what alerts are active?"
      A: - "what alerts are active?"
      - "alerts function usage"
      
      `,
      descriptionForUser: 'This function allows the assistant to recall previous learnings.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          queries: {
            type: 'array',
            additionalItems: false,
            additionalProperties: false,
            items: {
              type: 'string',
              description: 'The query for the semantic search',
            },
          },
        },
        required: ['queries' as const],
      },
    },
    ({ arguments: { queries } }, signal) => {
      return service
        .callApi('POST /internal/observability_ai_assistant/functions/recall', {
          params: {
            body: {
              queries,
            },
          },
          signal,
        })
        .then((response) => ({ content: response as unknown as Serializable }));
    }
  );
}
