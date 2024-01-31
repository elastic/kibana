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
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID_MESSAGES,
} from '@kbn/elastic-assistant-common';
import { ConversationResponse } from '../../schemas/conversations/common_attributes.gen';
import { buildResponse } from '../utils';
import { ElasticAssistantPluginRouter } from '../../types';
import { buildRouteValidationWithZod } from '../route_validation';
import {
  AppendConversationMessageRequestBody,
  AppendConversationMessageRequestParams,
} from '../../schemas/conversations/crud_conversation_route.gen';

export const appendConversationMessageRoute = (router: ElasticAssistantPluginRouter) => {
  router.versioned
    .post({
      access: 'public',
      path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID_MESSAGES,
      options: {
        tags: ['access:elasticAssistant'],
      },
    })
    .addVersion(
      {
        version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
        validate: {
          request: {
            body: buildRouteValidationWithZod(AppendConversationMessageRequestBody),
            params: buildRouteValidationWithZod(AppendConversationMessageRequestParams),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<ConversationResponse>> => {
        const assistantResponse = buildResponse(response);
        const { id } = request.params;
        try {
          const ctx = await context.resolve(['core', 'elasticAssistant']);
          const dataClient = await ctx.elasticAssistant.getAIAssistantConversationsDataClient();
          const existingConversation = await dataClient?.getConversation(id);
          if (existingConversation == null) {
            return assistantResponse.error({
              body: `conversation id: "${id}" not found`,
              statusCode: 404,
            });
          }

          const conversation = await dataClient?.appendConversationMessages(
            existingConversation,
            request.body.messages
          );
          if (conversation == null) {
            return assistantResponse.error({
              body: `conversation id: "${id}" was not updated with appended message`,
              statusCode: 400,
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
