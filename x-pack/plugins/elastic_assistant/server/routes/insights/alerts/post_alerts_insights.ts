/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { ActionsClientLlm } from '@kbn/elastic-assistant-common/impl/language_models';
import { type IKibanaResponse, IRouter, Logger } from '@kbn/core/server';
import {
  AlertsInsightsPostRequestBody,
  AlertsInsightsPostResponse,
  ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
  Replacements,
} from '@kbn/elastic-assistant-common';
import { transformError } from '@kbn/securitysolution-es-utils';

import { INSIGHTS_ALERTS } from '../../../../common/constants';
import { getAssistantToolParams, isInsightsFeatureEnabled } from './helpers';
import { DEFAULT_PLUGIN_NAME, getPluginNameFromRequest } from '../../helpers';
import { getLangSmithTracer } from '../../evaluate/utils';
import { buildResponse } from '../../../lib/build_response';
import { ElasticAssistantRequestHandlerContext } from '../../../types';
import { getLlmType } from '../../utils';

export const postAlertsInsightsRoute = (router: IRouter<ElasticAssistantRequestHandlerContext>) => {
  router.versioned
    .post({
      access: 'internal',
      path: INSIGHTS_ALERTS,
      options: {
        tags: ['access:elasticAssistant'],
      },
    })
    .addVersion(
      {
        version: ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
        validate: {
          request: {
            body: buildRouteValidationWithZod(AlertsInsightsPostRequestBody),
          },
          response: {
            200: {
              body: buildRouteValidationWithZod(AlertsInsightsPostResponse),
            },
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<AlertsInsightsPostResponse>> => {
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger: Logger = assistantContext.logger;

        try {
          // get the actions plugin start contract from the request context:
          const actions = (await context.elasticAssistant).actions;
          const pluginName = getPluginNameFromRequest({
            request,
            defaultPluginName: DEFAULT_PLUGIN_NAME,
            logger,
          });

          // feature flag check:
          const insightsFeatureEnabled = isInsightsFeatureEnabled({
            assistantContext,
            pluginName,
          });

          if (!insightsFeatureEnabled) {
            return response.notFound();
          }

          // get parameters from the request body
          const alertsIndexPattern = decodeURIComponent(request.body.alertsIndexPattern);
          const connectorId = decodeURIComponent(request.body.connectorId);
          const {
            actionTypeId,
            anonymizationFields,
            langSmithApiKey,
            langSmithProject,
            replacements,
            size,
          } = request.body;

          // get an Elasticsearch client for the authenticated user:
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          // callback to accumulate the latest replacements:
          let latestReplacements: Replacements = { ...replacements };
          const onNewReplacements = (newReplacements: Replacements) => {
            latestReplacements = { ...latestReplacements, ...newReplacements };
          };

          // get the insights tool:
          const assistantTools = (await context.elasticAssistant).getRegisteredTools(pluginName);
          const assistantTool = assistantTools.find((tool) => tool.id === 'insights-tool');
          if (!assistantTool) {
            return response.notFound(); // insights tool not found
          }

          const traceOptions = {
            projectName: langSmithProject,
            tracers: [
              ...getLangSmithTracer({
                apiKey: langSmithApiKey,
                projectName: langSmithProject,
                logger,
              }),
            ],
          };

          const llm = new ActionsClientLlm({
            actions,
            connectorId,
            llmType: getLlmType(actionTypeId),
            logger,
            request,
            temperature: 0, // zero temperature for insights, because we want structured JSON output
            traceOptions,
          });

          const assistantToolParams = getAssistantToolParams({
            alertsIndexPattern,
            anonymizationFields,
            esClient,
            latestReplacements,
            llm,
            onNewReplacements,
            request,
            size,
          });

          // invoke the insights tool:
          const toolInstance = assistantTool.getTool(assistantToolParams);
          const rawInsights = await toolInstance?.invoke('');
          if (rawInsights == null) {
            return response.customError({
              body: { message: 'tool returned no insights' },
              statusCode: 500,
            });
          }

          const parsedInsights = JSON.parse(rawInsights);

          return response.ok({
            body: {
              connector_id: connectorId,
              insights: parsedInsights,
              replacements: latestReplacements,
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
