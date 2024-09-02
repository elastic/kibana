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
import {
  CATEGORIZATION_GRAPH_PATH,
  CategorizationRequestBody,
  CategorizationResponse,
} from '../../common';
import { ROUTE_HANDLER_TIMEOUT } from '../constants';
import { getCategorizationGraph } from '../graphs/categorization';
import type { IntegrationAssistantRouteHandlerContext } from '../plugin';
import { getLLMClass, getLLMType } from '../util/llm';
import { buildRouteValidationWithZod } from '../util/route_validation';
import { withAvailability } from './with_availability';

export function registerCategorizationRoutes(
  router: IRouter<IntegrationAssistantRouteHandlerContext>
) {
  router.versioned
    .post({
      path: CATEGORIZATION_GRAPH_PATH,
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
            body: buildRouteValidationWithZod(CategorizationRequestBody),
          },
        },
      },
      withAvailability(
        async (context, req, res): Promise<IKibanaResponse<CategorizationResponse>> => {
          const { packageName, dataStreamName, rawSamples, currentPipeline, langSmithOptions } =
            req.body;
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

            const parameters = {
              packageName,
              dataStreamName,
              rawSamples,
              currentPipeline,
            };
            const options = {
              callbacks: [
                new APMTracer({ projectName: langSmithOptions?.projectName ?? 'default' }, logger),
                ...getLangSmithTracer({ ...langSmithOptions, logger }),
              ],
            };

            const graph = await getCategorizationGraph({ client, model });
            const results = await graph.invoke(parameters, options);

            return res.ok({ body: CategorizationResponse.parse(results) });
          } catch (e) {
            return res.badRequest({ body: e });
          }
        }
      )
    );
}
