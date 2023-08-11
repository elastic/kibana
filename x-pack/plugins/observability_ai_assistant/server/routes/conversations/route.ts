/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { notImplemented } from '@hapi/boom';
import * as t from 'io-ts';
import { merge } from 'lodash';
import { Conversation, MessageRole } from '../../../common/types';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';
import { conversationCreateRt, conversationUpdateRt } from '../runtime_types';

const getConversationRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
  params: t.type({
    path: t.type({
      conversationId: t.string,
    }),
  }),
  options: {
    tags: ['access:ai_assistant'],
  },
  handler: async (resources): Promise<Conversation> => {
    const { service, request, params } = resources;

    const client = await service.getClient({ request });

    if (!client) {
      throw notImplemented();
    }

    return client.get(params.path.conversationId);
  },
});

const findConversationsRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/conversations',
  params: t.partial({
    body: t.partial({
      query: t.string,
    }),
  }),
  options: {
    tags: ['access:ai_assistant'],
  },
  handler: async (resources): Promise<{ conversations: Conversation[] }> => {
    const { service, request, params } = resources;

    const client = await service.getClient({ request });

    if (!client) {
      throw notImplemented();
    }

    return client.find({ query: params?.body?.query });
  },
});

const createConversationRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/conversation',
  params: t.type({
    body: t.type({
      conversation: conversationCreateRt,
    }),
  }),
  options: {
    tags: ['access:ai_assistant'],
  },
  handler: async (resources): Promise<Conversation> => {
    const { service, request, params } = resources;

    const client = await service.getClient({ request });

    if (!client) {
      throw notImplemented();
    }

    return client.create(params.body.conversation);
  },
});

const updateConversationRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'PUT /internal/observability_ai_assistant/conversation/{conversationId}',
  params: t.type({
    path: t.type({
      conversationId: t.string,
    }),
    body: t.type({
      conversation: conversationUpdateRt,
    }),
  }),
  options: {
    tags: ['access:ai_assistant'],
  },
  handler: async (resources): Promise<Conversation> => {
    const { service, request, params } = resources;

    const client = await service.getClient({ request });

    if (!client) {
      throw notImplemented();
    }

    return client.update(
      merge({}, params.body.conversation, { conversation: { id: params.path.conversationId } })
    );
  },
});

const updateConversationTitleBasedOnMessages = createObservabilityAIAssistantServerRoute({
  endpoint: 'PUT /internal/observability_ai_assistant/conversation/{conversationId}/auto_title',
  params: t.type({
    path: t.type({
      conversationId: t.string,
    }),
    body: t.type({
      connectorId: t.string,
    }),
  }),
  options: {
    tags: ['access:ai_assistant'],
  },
  handler: async (resources): Promise<Conversation> => {
    const { service, request, params } = resources;

    const client = await service.getClient({ request });

    if (!client) {
      throw notImplemented();
    }

    const conversation = await client.get(params.path.conversationId);

    const response = await client.chat({
      messages: [
        {
          '@timestamp': new Date().toISOString(),
          message: {
            role: MessageRole.Assistant,
            content: conversation.messages.slice(1).reduce((acc, curr) => {
              return `${acc} ${curr.message.role}: ${curr.message.content}`;
            }, 'You are a helpful assistant for Elastic Observability. Assume the following message is the start of a conversation between you and a user; give this conversation a title based on this content: '),
          },
        },
      ],
      connectorId: params.body.connectorId,
      stream: false,
    });

    if ('object' in response && response.object === 'chat.completion') {
      const title =
        response.choices[0].message?.content?.slice(1, -1) ||
        `Conversation on ${conversation['@timestamp']}`;

      return client.update({
        ...conversation,
        conversation: { ...conversation.conversation, title },
      });
    }

    return Promise.resolve(conversation);
  },
});

const deleteConversationRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'DELETE /internal/observability_ai_assistant/conversation/{conversationId}',
  params: t.type({
    path: t.type({
      conversationId: t.string,
    }),
  }),
  options: {
    tags: ['access:ai_assistant'],
  },
  handler: async (resources): Promise<void> => {
    const { service, request, params } = resources;

    const client = await service.getClient({ request });

    if (!client) {
      throw notImplemented();
    }

    return client.delete(params.path.conversationId);
  },
});

export const conversationRoutes = {
  ...getConversationRoute,
  ...findConversationsRoute,
  ...createConversationRoute,
  ...updateConversationRoute,
  ...updateConversationTitleBasedOnMessages,
  ...deleteConversationRoute,
};
