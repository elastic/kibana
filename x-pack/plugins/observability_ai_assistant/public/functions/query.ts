/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Serializable } from '@kbn/utility-types';
import type { RegisterFunctionDefinition } from '../../common/types';
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
      name: 'query',
      contexts: ['core'],
      description:
        "Query Elasticsearch using ES|QL. ES|QL is Elasticsearch's Query Language. Don't assume this supports SQL or SQL like statements, use only the context in the conversation",
      descriptionForUser: 'Query Elasticsearch using ES|QL.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          query: {
            type: 'string',
            description: 'The ES|QL query',
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
              path: '/_query',
              body: {
                query,
              },
            },
          },
        })
        .then((response) => ({ content: response as Serializable }));
    }
  );
}
