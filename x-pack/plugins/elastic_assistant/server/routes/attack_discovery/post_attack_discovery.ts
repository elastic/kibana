/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { type IKibanaResponse, IRouter, Logger } from '@kbn/core/server';
import { uniq } from 'lodash/fp';
import {
  AttackDiscoveryPostRequestBody,
  AttackDiscoveryPostResponse,
  AttackDiscoveryResponse,
  AttackDiscovery,
  ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
  Replacements,
} from '@kbn/elastic-assistant-common';
import { transformError } from '@kbn/securitysolution-es-utils';
import { ActionsClientLlm } from '@kbn/langchain/server';

import moment from 'moment/moment';
import {
  ATTACK_DISCOVERY_ERROR_EVENT,
  ATTACK_DISCOVERY_SUCCESS_EVENT,
} from '../../lib/telemetry/event_based_telemetry';
import { ATTACK_DISCOVERY } from '../../../common/constants';
import { addGenerationInterval, attackDiscoveryStatus, getAssistantToolParams } from './helpers';
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
        const startTime = moment(); // start timing the generation
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger: Logger = assistantContext.logger;
        const telemetry = assistantContext.telemetry;

        try {
          // get the actions plugin start contract from the request context:
          const actions = (await context.elasticAssistant).actions;
          const dataClient = await assistantContext.getAttackDiscoveryDataClient();
          const authenticatedUser = assistantContext.getCurrentUser();
          if (authenticatedUser == null) {
            return resp.error({
              body: `Authenticated user not found`,
              statusCode: 401,
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
            connectorId: apiConfig.connectorId,
            llmType: getLlmType(apiConfig.actionTypeId),
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

          const foundAttackDiscovery = await dataClient?.findAttackDiscoveryByConnectorId({
            connectorId: apiConfig.connectorId,
            authenticatedUser,
          });
          let currentAd: AttackDiscoveryResponse;
          let attackDiscoveryId: string;
          if (foundAttackDiscovery == null) {
            const ad = await dataClient?.createAttackDiscovery({
              attackDiscoveryCreate: {
                attackDiscoveries: [],
                apiConfig,
                status: attackDiscoveryStatus.running,
                replacements: latestReplacements,
              },
              authenticatedUser,
            });
            if (ad == null) {
              throw new Error(
                `Could not create attack discovery for connectorId: ${apiConfig.connectorId}`
              );
            } else {
              currentAd = ad;
            }
            attackDiscoveryId = currentAd.id;
          } else {
            attackDiscoveryId = foundAttackDiscovery.id;

            const ad = await dataClient?.updateAttackDiscovery({
              attackDiscoveryUpdateProps: {
                id: attackDiscoveryId,
                status: attackDiscoveryStatus.running,
                backingIndex: foundAttackDiscovery.backingIndex,
              },
              authenticatedUser,
            });
            if (ad == null) {
              throw new Error(
                `Could not update attack discovery for connectorId: ${apiConfig.connectorId}`
              );
            } else {
              currentAd = ad;
            }
          }

          toolInstance
            ?.invoke('')
            .then(async (rawAttackDiscoveries) => {
              const getDataFromJSON = () => {
                const { alertsContextCount, attackDiscoveries } = JSON.parse(rawAttackDiscoveries);
                return { alertsContextCount, attackDiscoveries };
              };

              const endTime = moment();
              const durationMs = endTime.diff(startTime);

              if (rawAttackDiscoveries == null) {
                throw new Error('tool returned no attack discoveries');
              }
              const updateProps = {
                ...getDataFromJSON(),
                status: attackDiscoveryStatus.succeeded,
                generationIntervals: addGenerationInterval(currentAd.generationIntervals, {
                  durationMs,
                  date: new Date().toISOString(),
                }),
                id: attackDiscoveryId,
                replacements: latestReplacements,
                backingIndex: currentAd.backingIndex,
              };

              await dataClient?.updateAttackDiscovery({
                attackDiscoveryUpdateProps: updateProps,
                authenticatedUser,
              });

              telemetry.reportEvent(ATTACK_DISCOVERY_SUCCESS_EVENT.eventType, {
                actionTypeId: apiConfig.actionTypeId,
                alertsContextCount: updateProps.alertsContextCount,
                alertsCount: uniq(
                  updateProps.attackDiscoveries.flatMap(
                    (attackDiscovery: AttackDiscovery) => attackDiscovery.alertIds
                  )
                ).length,
                configuredAlertsCount: size,
                discoveriesGenerated: updateProps.attackDiscoveries.length,
                durationMs,
                model: apiConfig.model,
                provider: apiConfig.provider,
              });
            })
            .catch(async (err) => {
              logger.error(err);
              const error = transformError(err);
              telemetry.reportEvent(ATTACK_DISCOVERY_ERROR_EVENT.eventType, {
                actionTypeId: apiConfig.actionTypeId,
                errorMessage: error.message,
                model: apiConfig.model,
                provider: apiConfig.provider,
              });
              await dataClient?.updateAttackDiscovery({
                attackDiscoveryUpdateProps: {
                  attackDiscoveries: [],
                  status: attackDiscoveryStatus.failed,
                  id: attackDiscoveryId,
                  replacements: latestReplacements,
                  backingIndex: currentAd.backingIndex,
                },
                authenticatedUser,
              });
            });

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
