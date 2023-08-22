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
      description:
        'Use this function to recall earlier learnings. Anything you will summarise can be retrieved again later via this function.',
      descriptionForUser: 'This function allows the assistant to recall previous learnings.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          query: {
            type: 'string',
            description: 'The query for the semantic search',
          },
        },
        required: ['query' as const],
      },
    },
    ({ arguments: { query } }, signal) => {
      return service
        .callApi('POST /internal/observability_ai_assistant/functions/recall', {
          params: {
            body: {
              query,
            },
          },
          signal,
        })
        .then((response) => ({ content: response as unknown as Serializable }));
    }
  );
}
