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

import moment from 'moment/moment';
import { ATTACK_DISCOVERY } from '../../../common/constants';
import {
  getAssistantTool,
  getAssistantToolParams,
  handleToolError,
  updateAttackDiscoveries,
  updateAttackDiscoveryStatusToRunning,
} from './helpers';
import { DEFAULT_PLUGIN_NAME, getPluginNameFromRequest } from '../helpers';
import { buildResponse } from '../../lib/build_response';
import { ElasticAssistantRequestHandlerContext } from '../../types';

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
        const startTime = moment(); // start timing the generation
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger: Logger = assistantContext.logger;
        const telemetry = assistantContext.telemetry;

        try {
          // get the actions plugin start contract from the request context:
          const actions = (await context.elasticAssistant).actions;
          const actionsClient = await actions.getActionsClientWithRequest(request);
          const dataClient = await assistantContext.getAttackDiscoveryDataClient();
          const authenticatedUser = assistantContext.getCurrentUser();
          if (authenticatedUser == null) {
            return resp.error({
              body: `Authenticated user not found`,
              statusCode: 401,
            });
          }
          if (!dataClient) {
            return resp.error({
              body: `Attack discovery data client not initialized`,
              statusCode: 500,
            });
          }
          const pluginName = getPluginNameFromRequest({
            request,
            defaultPluginName: DEFAULT_PLUGIN_NAME,
            logger,
          });

          // get parameters from the request body
          const alertsIndexPattern = decodeURIComponent(request.body.alertsIndexPattern);
          const {
            apiConfig,
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

          const assistantTool = getAssistantTool(
            (await context.elasticAssistant).getRegisteredTools,
            pluginName
          );

          if (!assistantTool) {
            return response.notFound(); // attack discovery tool not found
          }

          const assistantToolParams = getAssistantToolParams({
            actionsClient,
            alertsIndexPattern,
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
            size,
          });

          // invoke the attack discovery tool:
          const toolInstance = assistantTool.getTool(assistantToolParams);

          const { currentAd, attackDiscoveryId } = await updateAttackDiscoveryStatusToRunning(
            dataClient,
            authenticatedUser,
            apiConfig
          );

          toolInstance
            ?.invoke('')
            .then((rawAttackDiscoveries: string) =>
              updateAttackDiscoveries({
                apiConfig,
                attackDiscoveryId,
                authenticatedUser,
                dataClient,
                latestReplacements,
                logger,
                rawAttackDiscoveries,
                size,
                startTime,
                telemetry,
              })
            )
            .catch((err) =>
              handleToolError({
                apiConfig,
                attackDiscoveryId,
                authenticatedUser,
                dataClient,
                err,
                latestReplacements,
                logger,
                telemetry,
              })
            );

          return response.ok({
            body: currentAd,
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
