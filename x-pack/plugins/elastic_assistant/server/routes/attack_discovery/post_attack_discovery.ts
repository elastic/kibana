/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { type IKibanaResponse, IRouter, Logger } from '@kbn/core/server';
import {
  AttackDiscoveryPostRequestBody,
  AttackDiscoveryPostResponse,
  ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
  Replacements,
} from '@kbn/elastic-assistant-common';
import { transformError } from '@kbn/securitysolution-es-utils';
import { ActionsClientLlm } from '@kbn/langchain/server';

import { ATTACK_DISCOVERY } from '../../../common/constants';
import { getAssistantToolParams } from './helpers';
import { DEFAULT_PLUGIN_NAME, getPluginNameFromRequest } from '../helpers';
import { getLangSmithTracer } from '../evaluate/utils';
import { buildResponse } from '../../lib/build_response';
import { ElasticAssistantRequestHandlerContext } from '../../types';
import { getLlmType } from '../utils';

const ROUTE_HANDLER_TIMEOUT = 10 * 60 * 1000; // 10 * 60 seconds = 10 minutes
const LANG_CHAIN_TIMEOUT = ROUTE_HANDLER_TIMEOUT - 10_000; // 9 minutes 50 seconds
const CONNECTOR_TIMEOUT = LANG_CHAIN_TIMEOUT - 10_000; // 9 minutes 40 seconds

export const postAttackDiscoveryRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
) => {
  router.versioned
    .post({
      access: 'internal',
      path: ATTACK_DISCOVERY,
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
            body: buildRouteValidationWithZod(AttackDiscoveryPostRequestBody),
          },
          response: {
            200: {
              body: { custom: buildRouteValidationWithZod(AttackDiscoveryPostResponse) },
            },
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<AttackDiscoveryPostResponse>> => {
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

          // get the attack discovery tool:
          const assistantTools = (await context.elasticAssistant).getRegisteredTools(pluginName);
          const assistantTool = assistantTools.find((tool) => tool.id === 'attack-discovery');
          if (!assistantTool) {
            return response.notFound(); // attack discovery tool not found
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
            temperature: 0, // zero temperature for attack discovery, because we want structured JSON output
            timeout: CONNECTOR_TIMEOUT,
            traceOptions,
          });

          const assistantToolParams = getAssistantToolParams({
            alertsIndexPattern,
            anonymizationFields,
            esClient,
            latestReplacements,
            langChainTimeout: LANG_CHAIN_TIMEOUT,
            llm,
            onNewReplacements,
            request,
            size,
          });

          // invoke the attack discovery tool:
          const toolInstance = assistantTool.getTool(assistantToolParams);
          const rawAttackDiscoveries = await toolInstance?.invoke('');
          if (rawAttackDiscoveries == null) {
            return response.customError({
              body: { message: 'tool returned no attack discoveries' },
              statusCode: 500,
            });
          }

          const { alertsContextCount, attackDiscoveries } = JSON.parse(rawAttackDiscoveries);

          return response.ok({
            body: {
              alertsContextCount,
              attackDiscoveries,
              connector_id: connectorId,
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
