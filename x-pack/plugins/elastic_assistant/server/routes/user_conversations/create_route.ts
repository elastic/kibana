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
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL,
  ConversationCreateProps,
  ConversationResponse,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { ElasticAssistantPluginRouter } from '../../types';
import { buildResponse } from '../utils';

export const createConversationRoute = (router: ElasticAssistantPluginRouter): void => {
  router.versioned
    .post({
      access: 'public',
      path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL,

      options: {
        tags: ['access:elasticAssistant'],
      },
    })
    .addVersion(
      {
        version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
        validate: {
          request: {
            body: buildRouteValidationWithZod(ConversationCreateProps),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<ConversationResponse>> => {
        const assistantResponse = buildResponse(response);
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

          const createdConversation = await dataClient?.createConversation({
            conversation: request.body,
            authenticatedUser,
          });

          if (createdConversation == null) {
            return assistantResponse.error({
              body: `conversation with title: "${request.body.title}" was not created`,
              statusCode: 400,
            });
          }
          return response.ok({
            body: ConversationResponse.parse(createdConversation),
          });
        } catch (err) {
          const error = transformError(err as Error);
          return assistantResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
