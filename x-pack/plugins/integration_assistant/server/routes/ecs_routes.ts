/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, IRouter } from '@kbn/core/server';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import {
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';
import { APMTracer } from '@kbn/langchain/server/tracers/apm';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import { ECS_GRAPH_PATH, EcsMappingRequestBody, EcsMappingResponse } from '../../common';
import { LogType, ROUTE_HANDLER_TIMEOUT, MAX_IMPORT_PAYLOAD_BYTES } from '../constants';
import { getEcsGraph } from '../graphs/ecs';
import type { IntegrationAssistantRouteHandlerContext } from '../plugin';
import { buildRouteValidationWithZod } from '../util/route_validation';
import { withAvailability } from './with_availability';
import { getLogTypeDetectionGraph } from '../graphs/log_type_detection/graph';
import { decodeRawSamples, parseSamples } from '../util/parse';

export function registerEcsRoutes(router: IRouter<IntegrationAssistantRouteHandlerContext>) {
  router.versioned
    .post({
      path: ECS_GRAPH_PATH,
      access: 'internal',
      options: {
        body: {
          maxBytes: MAX_IMPORT_PAYLOAD_BYTES,
        },
        timeout: {
          idleSocket: ROUTE_HANDLER_TIMEOUT,
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(EcsMappingRequestBody),
          },
        },
      },
      withAvailability(async (context, req, res): Promise<IKibanaResponse<EcsMappingResponse>> => {
        const { packageName, dataStreamName, encodedRawSamples, mapping, langSmithOptions } =
          req.body;
        const { getStartServices, logger } = await context.integrationAssistant;

        const [, { actions: actionsPlugin }] = await getStartServices();
        try {
          const actionsClient = await actionsPlugin.getActionsClientWithRequest(req);
          const connector = req.body.connectorId
            ? await actionsClient.get({ id: req.body.connectorId })
            : (await actionsClient.getAll()).filter(
                (connectorItem) => connectorItem.actionTypeId === '.bedrock'
              )[0];

          const abortSignal = getRequestAbortedSignal(req.events.aborted$);
          const isOpenAI = connector.actionTypeId === '.gen-ai';

          const llmClass = isOpenAI ? ActionsClientChatOpenAI : ActionsClientSimpleChatModel;

          const model = new llmClass({
            actionsClient,
            connectorId: connector.id,
            logger,
            llmType: isOpenAI ? 'openai' : 'bedrock',
            model: connector.config?.defaultModel,
            temperature: 0.05,
            maxTokens: 4096,
            signal: abortSignal,
            streaming: false,
          });

          let graph;
          let ecsMappingResults;
          const options = {
            callbacks: [
              new APMTracer({ projectName: langSmithOptions?.projectName ?? 'default' }, logger),
              ...getLangSmithTracer({ ...langSmithOptions, logger }),
            ],
          };

          const logsSampleDecoded = decodeRawSamples(encodedRawSamples);
          const { isJSON, parsedSamples } = parseSamples(logsSampleDecoded);

          if (isJSON) {
            const ecsParameters = {
              packageName,
              dataStreamName,
              rawSamples: parsedSamples,
              ...(mapping && { mapping }),
            };
            graph = await getEcsGraph(model);
            ecsMappingResults = await graph.invoke(ecsParameters, options);
          } else {
            // Non JSON log samples. Could be some syslog structured / unstructured logs
            const logTypeParameters = {
              packageName,
              dataStreamName,
              rawSamples: parsedSamples,
            };
            graph = await getLogTypeDetectionGraph(model);
            const logTypeDetectionResults = await graph.invoke(logTypeParameters, options);

            if (
              logTypeDetectionResults.logType === LogType.UNSUPPORTED ||
              logTypeDetectionResults.logType === LogType.CSV ||
              logTypeDetectionResults.logType === LogType.STRUCTURED ||
              logTypeDetectionResults.logType === LogType.UNSTRUCTURED
            ) {
              return res.customError({
                statusCode: 501,
                body: { message: 'Unsupported log type' },
              });
            }

            const ecsParameters = {
              packageName,
              dataStreamName,
              rawSamples: parsedSamples,
              ...(mapping && { mapping }),
            };
            graph = await getEcsGraph(model);
            ecsMappingResults = await graph.invoke(ecsParameters, options);
          }
          return res.ok({ body: EcsMappingResponse.parse(ecsMappingResults) });
        } catch (e) {
          return res.badRequest({ body: e });
        }
      })
    );
}
