/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, IRouter } from '@kbn/core/server';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import { APMTracer } from '@kbn/langchain/server/tracers/apm';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import { ANALYZE_LOGS_PATH, AnalyzeLogsRequestBody, AnalyzeLogsResponse } from '../../common';
import { ROUTE_HANDLER_TIMEOUT } from '../constants';
import { getLogFormatDetectionGraph } from '../graphs/log_type_detection/graph';
import type { IntegrationAssistantRouteHandlerContext } from '../plugin';
import { getLLMClass, getLLMType } from '../util/llm';
import { buildRouteValidationWithZod } from '../util/route_validation';
import { withAvailability } from './with_availability';
import { isErrorThatHandlesItsOwnResponse, UnsupportedLogFormatError } from '../lib/errors';
import { handleCustomErrors } from './routes_util';
import { GenerationErrorCode } from '../../common/constants';

export function registerAnalyzeLogsRoutes(
  router: IRouter<IntegrationAssistantRouteHandlerContext>
) {
  router.versioned
    .post({
      path: ANALYZE_LOGS_PATH,
      access: 'internal',
      options: {
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
            body: buildRouteValidationWithZod(AnalyzeLogsRequestBody),
          },
        },
      },
      withAvailability(async (context, req, res): Promise<IKibanaResponse<AnalyzeLogsResponse>> => {
        const {
          packageName,
          dataStreamName,
          packageTitle,
          dataStreamTitle,
          logSamples,
          langSmithOptions,
        } = req.body;
        const services = await context.resolve(['core']);
        const { client } = services.core.elasticsearch;
        const { getStartServices, logger } = await context.integrationAssistant;
        const [, { actions: actionsPlugin }] = await getStartServices();
        try {
          const actionsClient = await actionsPlugin.getActionsClientWithRequest(req);
          const connector = await actionsClient.get({ id: req.body.connectorId });

          const abortSignal = getRequestAbortedSignal(req.events.aborted$);

          const actionTypeId = connector.actionTypeId;
          const llmType = getLLMType(actionTypeId);
          const llmClass = getLLMClass(llmType);

          const model = new llmClass({
            actionsClient,
            connectorId: connector.id,
            logger,
            llmType,
            model: connector.config?.defaultModel,
            temperature: 0.05,
            maxTokens: 4096,
            signal: abortSignal,
            streaming: false,
          });
          const options = {
            callbacks: [
              new APMTracer({ projectName: langSmithOptions?.projectName ?? 'default' }, logger),
              ...getLangSmithTracer({ ...langSmithOptions, logger }),
            ],
          };

          const logFormatParameters = {
            packageName,
            dataStreamName,
            packageTitle,
            dataStreamTitle,
            logSamples,
          };
          const graph = await getLogFormatDetectionGraph({ model, client });
          const graphResults = await graph.invoke(logFormatParameters, options);
          const graphLogFormat = graphResults.results.samplesFormat.name;
          if (graphLogFormat === 'unsupported') {
            throw new UnsupportedLogFormatError(GenerationErrorCode.UNSUPPORTED_LOG_SAMPLES_FORMAT);
          }
          return res.ok({ body: AnalyzeLogsResponse.parse(graphResults) });
        } catch (err) {
          try {
            handleCustomErrors(err, GenerationErrorCode.RECURSION_LIMIT_ANALYZE_LOGS);
          } catch (e) {
            if (isErrorThatHandlesItsOwnResponse(e)) {
              return e.sendResponse(res);
            }
          }
          return res.badRequest({ body: err });
        }
      })
    );
}
