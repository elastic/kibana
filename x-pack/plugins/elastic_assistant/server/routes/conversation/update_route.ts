/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { schema } from '@kbn/config-schema';
import {
  ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
} from '../../../common/constants';
import { ElasticAssistantPluginRouter } from '../../types';
import { buildRouteValidationWithZod } from '../route_validation';
import {
  ConversationResponse,
  ConversationUpdateProps,
} from '../../schemas/conversations/common_attributes.gen';
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
            params: schema.object({
              conversationId: schema.string(),
            }),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<ConversationResponse>> => {
        const siemResponse = buildResponse(response);
        const { conversationId } = request.params;
        /* const validationErrors = validateUpdateConversationProps(request.body);
        if (validationErrors.length) {
          return siemResponse.error({ statusCode: 400, body: validationErrors });
        }*/
        try {
          const ctx = await context.resolve(['core', 'elasticAssistant']);

          const dataClient = await ctx.elasticAssistant.getAIAssistantDataClient();

          const existingConversation = await dataClient?.getConversation(conversationId);
          if (existingConversation == null) {
            return siemResponse.error({
              body: `conversation id: "${conversationId}" not found`,
              statusCode: 404,
            });
          }
          const conversation = await dataClient?.updateConversation(
            existingConversation,
            request.body
          );
          if (conversation == null) {
            return siemResponse.error({
              body: `conversation id: "${conversationId}" was not updated`,
              statusCode: 400,
            });
          }
          return response.ok({
            body: conversation,
          });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
