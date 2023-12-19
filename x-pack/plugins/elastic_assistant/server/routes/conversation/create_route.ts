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
} from '../../../common/constants';
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
        const siemResponse = buildResponse(response);
        // const validationErrors = validateCreateRuleProps(request.body);
        // if (validationErrors.length) {
        //  return siemResponse.error({ statusCode: 400, body: validationErrors });
        // }

        try {
          const ctx = await context.resolve(['core', 'elasticAssistant']);

          const dataClient = await ctx.elasticAssistant.getAIAssistantDataClient();
          const createdConversation = await dataClient?.createConversation(request.body);
          return response.ok({
            body: ConversationResponse.parse(createdConversation),
          });
        } catch (err) {
          const error = transformError(err as Error);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
