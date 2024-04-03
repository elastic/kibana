/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
} from '@kbn/elastic-assistant-common';
import {
  ConversationResponse,
  ConversationUpdateProps,
} from '@kbn/elastic-assistant-common/impl/schemas/conversations/common_attributes.gen';
import { UpdateConversationRequestParams } from '@kbn/elastic-assistant-common/impl/schemas/conversations/crud_conversation_route.gen';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { ElasticAssistantPluginRouter } from '../../types';
import { buildResponse } from '../utils';

export const updateConversationRoute = (router: ElasticAssistantPluginRouter) => {
  router.versioned
    .put({
      access: 'public',
      path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
      options: {
        tags: ['access:elasticAssistant'],
      },
    })
    .addVersion(
      {
        version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
        validate: {
          request: {
            body: buildRouteValidationWithZod(ConversationUpdateProps),
            params: buildRouteValidationWithZod(UpdateConversationRequestParams),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<ConversationResponse>> => {
        const assistantResponse = buildResponse(response);
        const { id } = request.params;
        try {
          const ctx = await context.resolve(['core', 'elasticAssistant']);

          const dataClient = await ctx.elasticAssistant.getAIAssistantConversationsDataClient();
          const authenticatedUser = ctx.elasticAssistant.getCurrentUser();
          if (authenticatedUser == null) {
            return assistantResponse.error({
              body: `Authenticated user not found`,
              statusCode: 401,
            });
          }

          const existingConversation = await dataClient?.getConversation({ id, authenticatedUser });
          if (existingConversation == null) {
            return assistantResponse.error({
              body: `conversation id: "${id}" not found`,
              statusCode: 404,
            });
          }
          const conversation = await dataClient?.updateConversation({
            conversationUpdateProps: request.body,
            authenticatedUser,
          });
          if (conversation == null) {
            return assistantResponse.error({
              body: `conversation id: "${id}" was not updated`,
              statusCode: 400,
            });
          }
          return response.ok({
            body: conversation,
          });
        } catch (err) {
          const error = transformError(err);
          return assistantResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
