/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';

import { IRouter, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import {
  DEFEND_INSIGHTS,
  DefendInsightsGetResponse,
  DefendInsightsGetRequestQuery,
  ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
} from '@kbn/elastic-assistant-common';
import { transformError } from '@kbn/securitysolution-es-utils';

import { buildResponse } from '../../lib/build_response';
import { ElasticAssistantRequestHandlerContext } from '../../types';
import { isDefendInsightsEnabled, updateDefendInsightsLastViewedAt } from './helpers';

export const getDefendInsightsRoute = (router: IRouter<ElasticAssistantRequestHandlerContext>) => {
  router.versioned
    .get({
      access: 'internal',
      path: DEFEND_INSIGHTS,
      options: {
        tags: ['access:elasticAssistant'],
      },
    })
    .addVersion(
      {
        version: ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
        validate: {
          request: {
            query: buildRouteValidationWithZod(DefendInsightsGetRequestQuery),
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
          const isEnabled = isDefendInsightsEnabled({
            request,
            logger,
            assistantContext,
          });
          if (!isEnabled) {
            return response.notFound();
          }

          const dataClient = await assistantContext.getDefendInsightsDataClient();

          const authenticatedUser = assistantContext.getCurrentUser();
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

          const defendInsights = await updateDefendInsightsLastViewedAt({
            dataClient,
            params: request.query,
            authenticatedUser,
          });
          return response.ok({
            body: {
              data: defendInsights,
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
