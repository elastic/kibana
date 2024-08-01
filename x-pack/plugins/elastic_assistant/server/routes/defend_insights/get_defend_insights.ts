/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type IKibanaResponse, IRouter, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import {
  DefendInsightsGetResponse,
  DefendInsightsGetRequestParams,
  ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
} from '@kbn/elastic-assistant-common';
import { transformError } from '@kbn/securitysolution-es-utils';

import { DEFEND_INSIGHTS_BY_CONNECTOR_ID } from '../../../common/constants';
import { buildResponse } from '../../lib/build_response';
import { ElasticAssistantRequestHandlerContext } from '../../types';
import { updateDefendInsightLastViewedAt, getDefendInsightStats } from './helpers';

export const getDefendInsightRoute = (router: IRouter<ElasticAssistantRequestHandlerContext>) => {
  router.versioned
    .get({
      access: 'internal',
      path: DEFEND_INSIGHTS_BY_CONNECTOR_ID,
      options: {
        tags: ['access:elasticAssistant'],
      },
    })
    .addVersion(
      {
        version: ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidationWithZod(DefendInsightsGetRequestParams),
          },
          response: {
            200: {
              body: { custom: buildRouteValidationWithZod(DefendInsightsGetResponse) },
            },
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<DefendInsightsGetResponse>> => {
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger: Logger = assistantContext.logger;
        try {
          const dataClient = await assistantContext.getDefendInsightsDataClient();

          const authenticatedUser = assistantContext.getCurrentUser();
          const connectorId = decodeURIComponent(request.params.connectorId);
          if (authenticatedUser == null) {
            return resp.error({
              body: `Authenticated user not found`,
              statusCode: 401,
            });
          }
          if (!dataClient) {
            return resp.error({
              body: `Defend insights data client not initialized`,
              statusCode: 500,
            });
          }
          const defendInsight = await updateDefendInsightLastViewedAt({
            dataClient,
            connectorId,
            authenticatedUser,
          });
          const stats = await getDefendInsightStats({
            dataClient,
            authenticatedUser,
          });
          return response.ok({
            body:
              defendInsight != null
                ? {
                    data: defendInsight,
                    stats,
                  }
                : {
                    stats,
                  },
          });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);

          return resp.error({
            body: { success: false, error: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
};
