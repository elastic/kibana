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
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND_USER_CONVERSATIONS,
} from '../../../common/constants';
import { ElasticAssistantPluginRouter } from '../../types';
import {
  FindConversationsRequestQuery,
  FindConversationsResponse,
} from '../../schemas/conversations/find_conversations_route.gen';
import { buildRouteValidationWithZod } from '../route_validation';
import { buildResponse } from '../utils';

export const findUserConversationsRoute = (router: ElasticAssistantPluginRouter) => {
  router.versioned
    .get({
      access: 'public',
      path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND_USER_CONVERSATIONS,
      options: {
        tags: ['access:elasticAssistant'],
      },
    })
    .addVersion(
      {
        version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
        validate: {
          request: {
            query: buildRouteValidationWithZod(FindConversationsRequestQuery),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<FindConversationsResponse>> => {
        const siemResponse = buildResponse(response);

        /* const validationErrors = validateFindConversationsRequestQuery(request.query);
        if (validationErrors.length) {
          return siemResponse.error({ statusCode: 400, body: validationErrors });
        }*/

        try {
          const { query } = request;
          const ctx = await context.resolve(['core', 'elasticAssistant']);
          const dataClient = await ctx.elasticAssistant.getAIAssistantDataClient();
          const currentUser = ctx.elasticAssistant.getCurrentUser();

          const additionalFilter = query.filter ? `AND ${query.filter}` : '';
          const result = await dataClient?.findConversations({
            perPage: query.per_page,
            page: query.page,
            sortField: query.sort_field,
            sortOrder: query.sort_order,
            filter: `user.id:${currentUser?.profile_uid}${additionalFilter}`,
            fields: query.fields,
          });

          return response.ok({ body: result });
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
