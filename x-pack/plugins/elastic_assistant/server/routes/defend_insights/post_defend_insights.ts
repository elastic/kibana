/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment/moment';

import type { IKibanaResponse } from '@kbn/core/server';

import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import {
  DEFEND_INSIGHTS,
  DefendInsightsPostRequestBody,
  DefendInsightsPostResponse,
  ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
  Replacements,
} from '@kbn/elastic-assistant-common';
import { transformError } from '@kbn/securitysolution-es-utils';
import { IRouter, Logger } from '@kbn/core/server';

import { buildResponse } from '../../lib/build_response';
import { ElasticAssistantRequestHandlerContext } from '../../types';
import { DEFAULT_PLUGIN_NAME, getPluginNameFromRequest } from '../helpers';
import {
  getAssistantTool,
  getAssistantToolParams,
  handleToolError,
  createDefendInsight,
  updateDefendInsights,
  isDefendInsightsEnabled,
} from './helpers';

const ROUTE_HANDLER_TIMEOUT = 10 * 60 * 1000; // 10 * 60 seconds = 10 minutes
const LANG_CHAIN_TIMEOUT = ROUTE_HANDLER_TIMEOUT - 10_000; // 9 minutes 50 seconds
const CONNECTOR_TIMEOUT = LANG_CHAIN_TIMEOUT - 10_000; // 9 minutes 40 seconds

export const postDefendInsightsRoute = (router: IRouter<ElasticAssistantRequestHandlerContext>) => {
  router.versioned
    .post({
      access: 'internal',
      path: DEFEND_INSIGHTS,
      options: {
        tags: ['access:elasticAssistant'],
        timeout: {
          idleSocket: ROUTE_HANDLER_TIMEOUT,
        },
      },
    })
    .addVersion(
      {
        version: ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
        validate: {
          request: {
            body: buildRouteValidationWithZod(DefendInsightsPostRequestBody),
          },
          response: {
            200: {
              body: { custom: buildRouteValidationWithZod(DefendInsightsPostResponse) },
            },
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<DefendInsightsPostResponse>> => {
        const startTime = moment(); // start timing the generation
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger: Logger = assistantContext.logger;
        const telemetry = assistantContext.telemetry;

        try {
          const isEnabled = isDefendInsightsEnabled({
            request,
            logger,
            assistantContext,
          });
          if (!isEnabled) {
            return response.notFound();
          }

          const actions = assistantContext.actions;
          const actionsClient = await actions.getActionsClientWithRequest(request);
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

          const pluginName = getPluginNameFromRequest({
            request,
            defaultPluginName: DEFAULT_PLUGIN_NAME,
            logger,
          });
          const assistantTool = getAssistantTool(assistantContext.getRegisteredTools, pluginName);

          if (!assistantTool) {
            return response.notFound();
          }

          const {
            endpointIds,
            insightType,
            apiConfig,
            anonymizationFields,
            langSmithApiKey,
            langSmithProject,
            replacements,
          } = request.body;

          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          let latestReplacements: Replacements = { ...replacements };
          const onNewReplacements = (newReplacements: Replacements) => {
            latestReplacements = { ...latestReplacements, ...newReplacements };
          };

          const assistantToolParams = getAssistantToolParams({
            endpointIds,
            insightType,
            actionsClient,
            anonymizationFields,
            apiConfig,
            esClient,
            latestReplacements,
            connectorTimeout: CONNECTOR_TIMEOUT,
            langChainTimeout: LANG_CHAIN_TIMEOUT,
            langSmithProject,
            langSmithApiKey,
            logger,
            onNewReplacements,
            request,
          });

          const toolInstance = assistantTool.getTool(assistantToolParams);

          const { currentInsight, defendInsightId } = await createDefendInsight(
            endpointIds,
            insightType,
            dataClient,
            authenticatedUser,
            apiConfig
          );

          toolInstance
            ?.invoke('')
            .then((rawDefendInsights: string) =>
              updateDefendInsights({
                apiConfig,
                defendInsightId,
                authenticatedUser,
                dataClient,
                latestReplacements,
                logger,
                rawDefendInsights,
                startTime,
                telemetry,
              })
            )
            .catch((err) =>
              handleToolError({
                apiConfig,
                defendInsightId,
                authenticatedUser,
                dataClient,
                err,
                latestReplacements,
                logger,
                telemetry,
              })
            );

          return response.ok({
            body: currentInsight,
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
