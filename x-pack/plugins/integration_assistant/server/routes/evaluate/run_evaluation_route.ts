/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, IRouter } from '@kbn/core/server';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import { PostEvaluateRequestBody, PostEvaluateResponse } from '@kbn/elastic-assistant-common';
import { v4 as uuidv4 } from 'uuid';
import { ROUTE_HANDLER_TIMEOUT } from '../../constants';
import type { IntegrationAssistantRouteHandlerContext } from '../../plugin';
import { buildRouteValidationWithZod } from '../../util/route_validation';
import { withAvailability } from '../with_availability';
import { isErrorThatHandlesItsOwnResponse } from '../../lib/errors';
import { handleCustomErrors } from '../routes_util';
import { GenerationErrorCode, RUN_EVALUATION_PATH } from '../../../common/constants';
import { fetchLangSmithDataset } from '../../util/util';
import { evaluateGraph } from '../../lib/evaluation/run_ecs_evaluation';
import { getGraphsFromNames } from './get_graphs_from_names';

const LANG_CHAIN_TIMEOUT = ROUTE_HANDLER_TIMEOUT - 10_000; // 9 minutes 50 seconds
const CONNECTOR_TIMEOUT = LANG_CHAIN_TIMEOUT - 10_000; // 9 minutes 40 seconds

export function registerEvaluationRoute(router: IRouter<IntegrationAssistantRouteHandlerContext>) {
  router.versioned
    .post({
      path: RUN_EVALUATION_PATH,
      access: 'public',
      options: {
        timeout: {
          idleSocket: ROUTE_HANDLER_TIMEOUT,
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: buildRouteValidationWithZod(PostEvaluateRequestBody),
          },
        },
      },
      withAvailability(
        async (context, request, response): Promise<IKibanaResponse<PostEvaluateResponse>> => {
          const evaluationId = uuidv4();
          const {
            datasetName,
            evaluatorConnectorId,
            graphs: graphNames,
            langSmithApiKey,
            langSmithProject,
            connectorIds,
            runName = evaluationId,
          } = request.body;

          const { getStartServices, logger } = await context.integrationAssistant;
          const [, { actions: actionsPlugin }] = await getStartServices();

          try {
            const actionsClient = await actionsPlugin.getActionsClientWithRequest(request);
            const connectors = await actionsClient.getBulk({
              ids: connectorIds,
              throwIfSystemAction: false,
            });
            const abortSignal = getRequestAbortedSignal(request.events.aborted$);
            const dataset = await fetchLangSmithDataset(datasetName, logger, langSmithApiKey);
            if (dataset.length === 0) {
              return response.badRequest({
                body: { message: `No LangSmith dataset found for name: ${datasetName}` },
              });
            }

            logger.info('postEvaluateRoute:');
            logger.info(`Evaluation ID: ${evaluationId}`);

            const totalExecutions = connectorIds.length * graphNames.length * dataset.length;
            logger.info('Creating graphs:');
            logger.info(`\tconnectors/models: ${connectorIds.length}`);
            logger.info(`\tgraphs: ${graphNames.length}`);
            logger.info(`\tdataset: ${dataset.length}`);
            logger.warn(`\ttotal graph executions: ${totalExecutions} `);
            if (totalExecutions > 50) {
              logger.warn(
                `Total baseline graph executions >= 50! This may take a while, and cost some money...`
              );
            }

            const { ecsGraphs } = getGraphsFromNames(graphNames);

            logger.warn(`${ecsGraphs.length}`);

            try {
              await evaluateGraph({
                actionsClient,
                ecsGraphs,
                connectors,
                connectorTimeout: CONNECTOR_TIMEOUT,
                datasetName,
                abortSignal,
                evaluationId,
                evaluatorConnectorId,
                langSmithApiKey,
                langSmithProject,
                logger,
                runName,
              });
            } catch (err) {
              logger.error(() => `Error evaluating automatic import: ${err}`);
            }
            return response.ok({
              body: { evaluationId, success: true },
            });
          } catch (err) {
            try {
              handleCustomErrors(err, GenerationErrorCode.RECURSION_LIMIT);
            } catch (e) {
              if (isErrorThatHandlesItsOwnResponse(e)) {
                return e.sendResponse(response);
              }
            }
            return response.badRequest({ body: err });
          }
        }
      )
    );
}
