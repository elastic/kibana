/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { notImplemented } from '@hapi/boom';
import * as t from 'io-ts';
import { toBooleanRt } from '@kbn/io-ts-utils';
import type { CreateChatCompletionResponse } from 'openai';
import { Readable } from 'stream';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';
import { messageRt } from '../runtime_types';

const chatRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/chat',
  options: {
    tags: ['access:ai_assistant'],
  },
  params: t.intersection([
    t.type({
      body: t.intersection([
        t.type({
          messages: t.array(messageRt),
          connectorId: t.string,
          functions: t.array(
            t.type({
              name: t.string,
              description: t.string,
              parameters: t.any,
            })
          ),
        }),
        t.partial({
          functionCall: t.string,
        }),
      ]),
    }),
    t.partial({ query: t.type({ stream: toBooleanRt }) }),
  ]),
  handler: async (resources): Promise<Readable | CreateChatCompletionResponse> => {
    const { request, params, service } = resources;

    const client = await service.getClient({ request });

    if (!client) {
      throw notImplemented();
    }

    const {
      body: { messages, connectorId, functions, functionCall },
      query = { stream: true },
    } = params;

    const stream = query.stream;

    return client.chat({
      messages,
      connectorId,
      stream,
      ...(functions.length
        ? {
            functions,
            functionCall,
          }
        : {}),
    });
  },
});

export const chatRoutes = {
  ...chatRoute,
};
