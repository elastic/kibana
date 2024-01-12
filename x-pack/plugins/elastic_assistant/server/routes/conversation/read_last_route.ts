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
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_LAST,
} from '../../../common/constants';
import { ConversationResponse } from '../../schemas/conversations/common_attributes.gen';
import { buildResponse } from '../utils';
import { ElasticAssistantPluginRouter } from '../../types';

export const readLastConversationRoute = (router: ElasticAssistantPluginRouter) => {
  router.versioned
    .get({
      access: 'public',
      path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_LAST,
      options: {
        tags: ['access:elasticAssistant'],
      },
    })
    .addVersion(
      {
        version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
        validate: false,
      },
      async (context, request, response): Promise<IKibanaResponse<ConversationResponse>> => {
        const responseObj = buildResponse(response);

        try {
          const ctx = await context.resolve(['core', 'elasticAssistant']);
          const dataClient = await ctx.elasticAssistant.getAIAssistantDataClient();

          const conversation = await dataClient?.getLastConversation();
          return response.ok({ body: conversation ?? {} });
        } catch (err) {
          const error = transformError(err);
          return responseObj.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
