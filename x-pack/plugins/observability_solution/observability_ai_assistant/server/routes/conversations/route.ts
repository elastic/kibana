/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { notImplemented } from '@hapi/boom';
import * as t from 'io-ts';
import { Conversation } from '../../../common/types';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';
import { conversationCreateRt, conversationUpdateRt } from '../runtime_types';

const getConversationRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
  params: t.type({
    path: t.type({
      conversationId: t.string,
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
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
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
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
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
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
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (resources): Promise<Conversation> => {
    const { service, request, params } = resources;

    const client = await service.getClient({ request });

    if (!client) {
      throw notImplemented();
    }

    return client.update(params.path.conversationId, params.body.conversation);
  },
});

const updateConversationTitle = createObservabilityAIAssistantServerRoute({
  endpoint: 'PUT /internal/observability_ai_assistant/conversation/{conversationId}/title',
  params: t.type({
    path: t.type({
      conversationId: t.string,
    }),
    body: t.type({
      title: t.string,
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (resources): Promise<Conversation> => {
    const { service, request, params } = resources;

    const client = await service.getClient({ request });

    if (!client) {
      throw notImplemented();
    }

    const conversation = await client.setTitle({
      conversationId: params.path.conversationId,
      title: params.body.title,
    });

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
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
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
  ...updateConversationTitle,
  ...deleteConversationRoute,
};
