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
  DocumentEntry,
  DocumentEntryType,
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
import { getKBUserFilter } from './utils';
import { ESQL_RESOURCE } from '../constants';

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

          const kbDataClient = await ctx.elasticAssistant.getAIAssistantKnowledgeBaseDataClient({
            v2KnowledgeBaseEnabled: true,
          });
          const currentUser = ctx.elasticAssistant.getCurrentUser();
          const userFilter = getKBUserFilter(currentUser);
          const additionalFilter = query.filter ? ` AND ${query.filter}` : '';
          const systemFilter = ` AND NOT kb_resource:"${ESQL_RESOURCE}"`;

          // TODO: Either plumb through new `findDocuments` that takes query DSL so you can do agg + pagination to collapse
          // TODO: system entries, use scoped esClient from request, or query them separate and mess with pagination...latter for now.
          const result = await kbDataClient?.findDocuments<EsKnowledgeBaseEntrySchema>({
            perPage: query.per_page,
            page: query.page,
            sortField: query.sort_field,
            sortOrder: query.sort_order,
            filter: `${userFilter}${systemFilter}${additionalFilter}`,
            fields: query.fields,
          });

          const systemResult = await kbDataClient?.findDocuments<EsKnowledgeBaseEntrySchema>({
            perPage: 1000,
            page: 1,
            filter: `kb_resource:"${ESQL_RESOURCE}"`,
          });

          // Group system entries
          const systemEntry = systemResult?.data.hits.hits?.[0]?._source;
          const systemEntryCount = systemResult?.data.hits.hits?.length ?? 1;
          const systemEntries: DocumentEntry[] =
            systemEntry == null
              ? []
              : [
                  {
                    id: 'someID',
                    createdAt: systemEntry.created_at,
                    createdBy: systemEntry.created_by,
                    updatedAt: systemEntry.updated_at,
                    updatedBy: systemEntry.updated_by,
                    users: [],
                    name: 'ES|QL documents',
                    namespace: systemEntry.namespace,
                    type: DocumentEntryType.value,
                    kbResource: ESQL_RESOURCE,
                    source: '',
                    required: true,
                    text: `${systemEntryCount}`,
                  },
                ];

          if (result) {
            return response.ok({
              body: {
                perPage: result.perPage,
                page: result.page,
                total: result.total,
                data: [...transformESSearchToKnowledgeBaseEntry(result.data), ...systemEntries],
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
