/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import { API_VERSIONS, ELASTIC_AI_ASSISTANT_PROMPTS_URL_FIND } from '@kbn/elastic-assistant-common';
import {
  FindPromptsRequestQuery,
  FindPromptsResponse,
} from '@kbn/elastic-assistant-common/impl/schemas/prompts/find_prompts_route.gen';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { i18n } from '@kbn/i18n';
import { ElasticAssistantPluginRouter } from '../../types';
import { buildResponse } from '../utils';
import { EsPromptsSchema } from '../../ai_assistant_data_clients/prompts/types';
import { transformESSearchToPrompts } from '../../ai_assistant_data_clients/prompts/helpers';
import { hasAIAssistantLicense } from '../helpers';

export const findPromptsRoute = (router: ElasticAssistantPluginRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'public',
      path: ELASTIC_AI_ASSISTANT_PROMPTS_URL_FIND,
      options: {
        tags: ['access:elasticAssistant'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(FindPromptsRequestQuery),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<FindPromptsResponse>> => {
        const assistantResponse = buildResponse(response);

        try {
          const { query } = request;
          const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
          const license = ctx.licensing.license;
          if (!hasAIAssistantLicense(license)) {
            return response.forbidden({
              body: {
                message: i18n.translate(
                  'xpack.elasticAssistant.licensing.unsupportedAIAssistantMessage',
                  {
                    defaultMessage:
                      'Your license does not support AI Assistant. Please upgrade your license.',
                  }
                ),
              },
            });
          }
          const dataClient = await ctx.elasticAssistant.getAIAssistantPromptsDataClient();

          const result = await dataClient?.findDocuments<EsPromptsSchema>({
            perPage: query.per_page,
            page: query.page,
            sortField: query.sort_field,
            sortOrder: query.sort_order,
            filter: query.filter,
            fields: query.fields,
          });

          if (result) {
            return response.ok({
              body: {
                perPage: result.perPage,
                page: result.page,
                total: result.total,
                data: transformESSearchToPrompts(result.data),
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
