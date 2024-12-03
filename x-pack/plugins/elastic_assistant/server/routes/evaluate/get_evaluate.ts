/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type IKibanaResponse, IRouter } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_EVALUATE_URL,
  INTERNAL_API_ACCESS,
  GetEvaluateResponse,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { buildResponse } from '../../lib/build_response';
import { ElasticAssistantRequestHandlerContext } from '../../types';
import { performChecks } from '../helpers';
import { ASSISTANT_GRAPH_MAP } from '../../lib/langchain/graphs';
import { fetchLangSmithDatasets } from './utils';

export const getEvaluateRoute = (router: IRouter<ElasticAssistantRequestHandlerContext>) => {
  router.versioned
    .get({
      access: INTERNAL_API_ACCESS,
      path: ELASTIC_AI_ASSISTANT_EVALUATE_URL,
      options: {
        tags: ['access:elasticAssistant'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          response: {
            200: {
              body: { custom: buildRouteValidationWithZod(GetEvaluateResponse) },
            },
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<GetEvaluateResponse>> => {
        const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
        const assistantContext = ctx.elasticAssistant;
        const logger = assistantContext.logger.get('evaluate');

        // Perform license, authenticated user and evaluation FF checks
        const checkResponse = performChecks({
          capability: 'assistantModelEvaluation',
          context: ctx,
          request,
          response,
        });

        if (!checkResponse.isSuccess) {
          return checkResponse.response;
        }

        // Fetch datasets from LangSmith // TODO: plumb apiKey so this will work in cloud w/o env vars
        const datasets = await fetchLangSmithDatasets({ logger });

        try {
          return response.ok({ body: { graphs: Object.keys(ASSISTANT_GRAPH_MAP), datasets } });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);

          const resp = buildResponse(response);
          return resp.error({
            body: { error: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
};
