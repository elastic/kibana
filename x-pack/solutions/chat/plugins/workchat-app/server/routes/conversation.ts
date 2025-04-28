/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { ConversationSummary } from '../../common/conversations';
import type {
  ListConversationRequest,
  ListConversationResponse,
  GetConversationResponse,
} from '../../common/http_api/conversation';
import { apiCapabilities } from '../../common/features';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';

export const registerConversationRoutes = ({ getServices, router, logger }: RouteDependencies) => {
  const wrapHandler = getHandlerWrapper({ logger });

  // get conversation by id
  router.get(
    {
      path: '/internal/workchat/conversations/{conversationId}',
      security: {
        authz: {
          requiredPrivileges: [apiCapabilities.useWorkchat],
        },
      },
      validate: {
        params: schema.object({
          conversationId: schema.string(),
        }),
      },
    },
    wrapHandler(async (ctx, request, res) => {
      const { conversationService } = getServices();
      const client = await conversationService.getScopedClient({ request });

      const { conversationId } = request.params;

      const conversation = await client.get({ conversationId });

      return res.ok<GetConversationResponse>({
        body: conversation,
      });
    })
  );

  // list all conversations for a given agent
  router.post(
    {
      path: '/internal/workchat/conversations',
      security: {
        authz: {
          requiredPrivileges: [apiCapabilities.useWorkchat],
        },
      },
      validate: {
        body: schema.object({
          agentId: schema.maybe(schema.string()),
        }),
      },
    },
    wrapHandler(async (ctx, request, res) => {
      const { conversationService } = getServices();
      const client = await conversationService.getScopedClient({ request });

      const params: ListConversationRequest = request.body;

      const conversations = await client.list({
        agentId: params.agentId,
      });

      const summaries = conversations.map<ConversationSummary>((conv) => {
        return {
          id: conv.id,
          agentId: conv.agentId,
          title: conv.title,
          lastUpdated: conv.lastUpdated,
        };
      });

      return res.ok<ListConversationResponse>({
        body: {
          conversations: summaries,
        },
      });
    })
  );
};
