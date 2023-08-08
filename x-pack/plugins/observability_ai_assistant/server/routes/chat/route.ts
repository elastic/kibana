/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type { IncomingMessage } from 'http';
import { notImplemented } from '@hapi/boom';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';
import { messageRt } from '../runtime_types';

const chatRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/chat',
  options: {
    tags: ['access:ai_assistant'],
  },
  params: t.type({
    body: t.type({
      messages: t.array(messageRt),
      connectorId: t.string,
    }),
  }),
  handler: async (resources): Promise<IncomingMessage> => {
    const { request, params, service } = resources;

    const client = await service.getClient({ request });

    if (!client) {
      throw notImplemented();
    }

    return client.chat({
      messages: params.body.messages,
      connectorId: params.body.connectorId,
    });
  },
});

export const chatRoutes = {
  ...chatRoute,
};
