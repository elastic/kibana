/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_FIND,
  FindKnowledgeBaseEntriesRequestQuery,
  FindKnowledgeBaseEntriesResponse,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { ElasticAssistantPluginRouter } from '../../../types';
import { buildResponse } from '../../utils';

import { performChecks } from '../../helpers';
import { transformESSearchToKnowledgeBaseEntry } from '../../../ai_assistant_data_clients/knowledge_base/transforms';
import { EsKnowledgeBaseEntrySchema } from '../../../ai_assistant_data_clients/knowledge_base/types';

export const findKnowledgeBaseEntriesRoute = (router: ElasticAssistantPluginRouter) => {
  router.versioned
    .get({
      access: 'internal',
      path: ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_FIND,
      options: {
        tags: ['access:elasticAssistant'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(FindKnowledgeBaseEntriesRequestQuery),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<FindKnowledgeBaseEntriesResponse>> => {
        const assistantResponse = buildResponse(response);
        try {
          const { query } = request;
          const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);

          // Perform license, authenticated user and FF checks
          const checkResponse = performChecks({
            authenticatedUser: true,
            capability: 'assistantKnowledgeBaseByDefault',
            context: ctx,
            license: true,
            request,
            response,
          });
          if (checkResponse) {
            return checkResponse;
          }

          const kbDataClient = await ctx.elasticAssistant.getAIAssistantKnowledgeBaseDataClient(
            false
          );
          const currentUser = ctx.elasticAssistant.getCurrentUser();

          const additionalFilter = query.filter ? ` AND ${query.filter}` : '';
          const result = await kbDataClient?.findDocuments<EsKnowledgeBaseEntrySchema>({
            perPage: query.per_page,
            page: query.page,
            sortField: query.sort_field,
            sortOrder: query.sort_order,
            filter: `users:{ id: "${currentUser?.profile_uid}" }${additionalFilter}`, // TODO: Update filter to include non-user system entries
            fields: query.fields,
          });

          if (result) {
            return response.ok({
              body: {
                perPage: result.perPage,
                page: result.page,
                total: result.total,
                data: transformESSearchToKnowledgeBaseEntry(result.data),
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
