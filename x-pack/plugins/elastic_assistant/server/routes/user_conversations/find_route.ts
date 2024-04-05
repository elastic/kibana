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
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND,
} from '@kbn/elastic-assistant-common';
import {
  FindConversationsRequestQuery,
  FindConversationsResponse,
} from '@kbn/elastic-assistant-common/impl/schemas/conversations/find_conversations_route.gen';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { ElasticAssistantPluginRouter } from '../../types';
import { buildResponse } from '../utils';
import { EsConversationSchema } from '../../ai_assistant_data_clients/conversations/types';
import { transformESSearchToConversations } from '../../ai_assistant_data_clients/conversations/transforms';

export const findUserConversationsRoute = (router: ElasticAssistantPluginRouter) => {
  router.versioned
    .get({
      access: 'public',
      path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND,
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
        const assistantResponse = buildResponse(response);
        try {
          const { query } = request;
          const ctx = await context.resolve(['core', 'elasticAssistant']);
          const dataClient = await ctx.elasticAssistant.getAIAssistantConversationsDataClient();
          const currentUser = ctx.elasticAssistant.getCurrentUser();

          const additionalFilter = query.filter ? ` AND ${query.filter}` : '';
          const result = await dataClient?.findDocuments<EsConversationSchema>({
            perPage: query.per_page,
            page: query.page,
            sortField: query.sort_field,
            sortOrder: query.sort_order,
            filter: `users:{ id: "${currentUser?.profile_uid}" }${additionalFilter}`,
            fields: query.fields,
          });

          if (result) {
            return response.ok({
              body: {
                perPage: result.perPage,
                page: result.page,
                total: result.total,
                data: transformESSearchToConversations(result.data),
              },
            });
          }
          return response.ok({
            body: { perPage: query.per_page, page: query.page, data: [], total: 0 },
          });
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
