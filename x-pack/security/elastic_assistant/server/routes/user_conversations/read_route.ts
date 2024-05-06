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
import { ConversationResponse } from '@kbn/elastic-assistant-common/impl/schemas/conversations/common_attributes.gen';
import { ReadConversationRequestParams } from '@kbn/elastic-assistant-common/impl/schemas/conversations/crud_conversation_route.gen';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { buildResponse } from '../utils';
import { ElasticAssistantPluginRouter } from '../../types';

export const readConversationRoute = (router: ElasticAssistantPluginRouter) => {
  router.versioned
    .get({
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
            params: buildRouteValidationWithZod(ReadConversationRequestParams),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<ConversationResponse>> => {
        const assistantResponse = buildResponse(response);

        const { id } = request.params;

        try {
          const ctx = await context.resolve(['core', 'elasticAssistant']);
          const authenticatedUser = ctx.elasticAssistant.getCurrentUser();
          if (authenticatedUser == null) {
            return assistantResponse.error({
              body: `Authenticated user not found`,
              statusCode: 401,
            });
          }

          const dataClient = await ctx.elasticAssistant.getAIAssistantConversationsDataClient();
          const conversation = await dataClient?.getConversation({ id, authenticatedUser });

          if (conversation == null) {
            return assistantResponse.error({
              body: `conversation id: "${id}" not found`,
              statusCode: 404,
            });
          }
          return response.ok({ body: conversation });
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
