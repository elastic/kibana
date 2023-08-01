/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';

const functionElasticsearchRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/functions/elasticsearch',
  options: {
    tags: ['access:ai_assistant'],
  },
  params: t.type({
    body: t.intersection([
      t.type({
        method: t.union([
          t.literal('GET'),
          t.literal('POST'),
          t.literal('PATCH'),
          t.literal('PUT'),
          t.literal('DELETE'),
        ]),
        path: t.string,
      }),
      t.partial({
        body: t.any,
      }),
    ]),
  }),
  handler: async (resources): Promise<unknown> => {
    const { method, path, body } = resources.params.body;

    const response = await (
      await resources.context.core
    ).elasticsearch.client.asCurrentUser.transport.request({
      method,
      path,
      body,
    });

    return response;
  },
});

export const functionRoutes = {
  ...functionElasticsearchRoute,
};
