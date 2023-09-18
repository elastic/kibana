/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { notImplemented } from '@hapi/boom';
import { IncomingMessage } from 'http';
import * as t from 'io-ts';
import { MessageRole } from '../../../common';
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
      functions: t.array(
        t.type({
          name: t.string,
          description: t.string,
          parameters: t.any,
        })
      ),
    }),
  }),
  handler: async (resources): Promise<IncomingMessage> => {
    const { request, params, service } = resources;

    const client = await service.getClient({ request });

    if (!client) {
      throw notImplemented();
    }

    const {
      body: { messages, connectorId, functions },
    } = params;

    const isStartOfConversation =
      messages.some((message) => message.message.role === MessageRole.Assistant) === false;

    const isRecallFunctionAvailable = functions.some((fn) => fn.name === 'recall') === true;

    const willUseRecall = isStartOfConversation && isRecallFunctionAvailable;

    return client.chat({
      messages,
      connectorId,
      ...(functions.length
        ? {
            functions,
            functionCall: willUseRecall ? 'recall' : undefined,
          }
        : {}),
    });
  },
});

export const chatRoutes = {
  ...chatRoute,
};
