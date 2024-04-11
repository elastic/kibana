/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND,
} from '@kbn/elastic-assistant-common';

import {
  FindAnonymizationFieldsRequestQuery,
  FindAnonymizationFieldsResponse,
} from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/find_anonymization_fields_route.gen';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { i18n } from '@kbn/i18n';
import { ElasticAssistantPluginRouter } from '../../types';
import { buildResponse } from '../utils';
import { EsAnonymizationFieldsSchema } from '../../ai_assistant_data_clients/anonymization_fields/types';
import { transformESSearchToAnonymizationFields } from '../../ai_assistant_data_clients/anonymization_fields/helpers';
import { hasAIAssistantLicense } from '../helpers';

export const findAnonymizationFieldsRoute = (
  router: ElasticAssistantPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      access: 'public',
      path: ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND,
      options: {
        tags: ['access:elasticAssistant'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(FindAnonymizationFieldsRequestQuery),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<FindAnonymizationFieldsResponse>> => {
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
          const dataClient =
            await ctx.elasticAssistant.getAIAssistantAnonymizationFieldsDataClient();

          const result = await dataClient?.findDocuments<EsAnonymizationFieldsSchema>({
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
                data: transformESSearchToAnonymizationFields(result.data),
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
