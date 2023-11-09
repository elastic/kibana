/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Serializable } from '@kbn/utility-types';
import type { RegisterFunctionDefinition } from '../../common/types';
import type { ObservabilityAIAssistantService } from '../types';

export function registerElasticsearchFunction({
  service,
  registerFunction,
}: {
  service: ObservabilityAIAssistantService;
  registerFunction: RegisterFunctionDefinition;
}) {
  registerFunction(
    {
      name: 'elasticsearch',
      contexts: ['core'],
      description:
        'Call Elasticsearch APIs on behalf of the user. Make sure the request body is valid for the API that you are using. Only call this function when the user has explicitly requested it.',
      descriptionForUser: 'Call Elasticsearch APIs on behalf of the user',
      parameters: {
        type: 'object',
        properties: {
          method: {
            type: 'string',
            description: 'The HTTP method of the Elasticsearch endpoint',
            enum: ['GET', 'PUT', 'POST', 'DELETE', 'PATCH'] as const,
          },
          path: {
            type: 'string',
            description: 'The path of the Elasticsearch endpoint, including query parameters',
          },
          body: {
            type: 'object',
            description: 'The body of the request',
          },
        },
        required: ['method', 'path'] as const,
      },
    },
    ({ arguments: { method, path, body } }, signal) => {
      return service
        .callApi(`POST /internal/observability_ai_assistant/functions/elasticsearch`, {
          signal,
          params: {
            body: {
              method,
              path,
              body,
            },
          },
        })
        .then((response) => ({ content: response as Serializable }));
    }
  );
}
