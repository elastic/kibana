/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  ConversationResponse,
  AppendConversationMessageRequestBody,
  AppendConversationMessageRequestParams,
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID_MESSAGES,
  API_VERSIONS,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { buildResponse } from '../utils';
import { ElasticAssistantPluginRouter } from '../../types';
import { performChecks } from '../helpers';

export const appendConversationMessageRoute = (router: ElasticAssistantPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID_MESSAGES,
      options: {
        tags: ['access:elasticAssistant'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
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
          const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
          const checkResponse = performChecks({
            context: ctx,
            request,
            response,
          });
          if (!checkResponse.isSuccess) {
            return checkResponse.response;
          }
          const dataClient = await ctx.elasticAssistant.getAIAssistantConversationsDataClient();
          const authenticatedUser = checkResponse.currentUser;

          const existingConversation = await dataClient?.getConversation({ id, authenticatedUser });
          if (existingConversation == null) {
            return assistantResponse.error({
              body: `conversation id: "${id}" not found`,
              statusCode: 404,
            });
          }

          const conversation = await dataClient?.appendConversationMessages({
            existingConversation,
            messages: request.body.messages,
          });
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
