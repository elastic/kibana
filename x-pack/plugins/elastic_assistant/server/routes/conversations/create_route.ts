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
} from '@kbn/elastic-assistant-common';
import { ElasticAssistantPluginRouter } from '../../types';
import {
  ConversationCreateProps,
  ConversationResponse,
} from '../../schemas/conversations/common_attributes.gen';
import { buildResponse } from '../utils';
import { buildRouteValidationWithZod } from '../route_validation';

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
          const currentUser = ctx.elasticAssistant.getCurrentUser();

          const result = await dataClient?.findConversations({
            perPage: 100,
            page: 1,
            filter: `user.id:${currentUser?.profile_uid} AND title:${request.body.title}`,
            fields: ['title'],
          });
          if (result?.data != null && result.data.length > 0) {
            return assistantResponse.error({
              statusCode: 409,
              body: `conversation title: "${request.body.title}" already exists`,
            });
          }
          const createdConversation = await dataClient?.createConversation(request.body);
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
