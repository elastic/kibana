/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionDefinition } from '../../common/functions/types';

export function buildFunctionElasticsearch(): FunctionDefinition {
  return {
    name: 'elasticsearch',
    description: 'Call Elasticsearch APIs on behalf of the user',
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
      },
      required: ['method' as const, 'path' as const],
    },
  };
}

export function buildFunctionServiceSummary(): FunctionDefinition {
  return {
    name: 'get_service_summary',
    description:
      'Gets a summary of a single service, including: the language, service version, deployments, infrastructure, alerting, etc. ',
    descriptionForUser: 'Get a summary for a single service.',
    parameters: {
      type: 'object',
    },
  };
}
