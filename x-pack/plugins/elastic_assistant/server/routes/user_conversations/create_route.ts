/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL,
  ConversationCreateProps,
  ConversationResponse,
  API_VERSIONS,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { ElasticAssistantPluginRouter } from '../../types';
import { buildResponse } from '../utils';
import { performChecks } from '../helpers';

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
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(ConversationCreateProps),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<ConversationResponse>> => {
        const assistantResponse = buildResponse(response);
        try {
          const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
          // Perform license and authenticated user checks
          const checkResponse = performChecks({
            authenticatedUser: true,
            context: ctx,
            license: true,
            request,
            response,
          });
          if (checkResponse) {
            return checkResponse;
          }
          const dataClient = await ctx.elasticAssistant.getAIAssistantConversationsDataClient();

          const currentUser = ctx.elasticAssistant.getCurrentUser();
          const userFilter = currentUser?.username
            ? `name: "${currentUser?.username}"`
            : `id: "${currentUser?.profile_uid}"`;
          const result = await dataClient?.findDocuments({
            perPage: 100,
            page: 1,
            filter: `users:{ ${userFilter} } AND title:${request.body.title}`,
            fields: ['title'],
          });
          if (result?.data != null && result.total > 0) {
            return assistantResponse.error({
              statusCode: 409,
              body: `conversation title: "${request.body.title}" already exists`,
            });
          }

          const createdConversation = await dataClient?.createConversation({
            conversation: request.body,
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
