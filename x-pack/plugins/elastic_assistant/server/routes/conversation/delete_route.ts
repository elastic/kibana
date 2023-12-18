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
import { ConversationResponse } from '../../schemas/conversations/common_attributes.gen';
import { buildResponse } from '../utils';

export const deleteConversationRoute = (router: ElasticAssistantPluginRouter) => {
  router.versioned
    .delete({
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
            params: schema.object({
              conversationId: schema.string(),
            }),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<ConversationResponse>> => {
        const siemResponse = buildResponse(response);
        /* const validationErrors = validateQueryRuleByIds(request.query);
        if (validationErrors.length) {
          return siemResponse.error({ statusCode: 400, body: validationErrors });
        }*/

        try {
          const { conversationId } = request.params;

          const ctx = await context.resolve(['core', 'elasticAssistant']);
          const dataClient = await ctx.elasticAssistant.getAIAssistantDataClient();

          const existingConversation = await dataClient?.getConversation(conversationId);
          if (existingConversation == null) {
            return siemResponse.error({
              body: `conversation id: "${conversationId}" not found`,
              statusCode: 404,
            });
          }
          await dataClient?.deleteConversation(conversationId);

          return response.ok({ body: {} });
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
