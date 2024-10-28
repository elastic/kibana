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
import { ECS_GRAPH_PATH, EcsMappingRequestBody, EcsMappingResponse } from '../../common';
import { ROUTE_HANDLER_TIMEOUT } from '../constants';
import { getEcsGraph } from '../graphs/ecs';
import type { IntegrationAssistantRouteHandlerContext } from '../plugin';
import { getLLMClass, getLLMType } from '../util/llm';
import { buildRouteValidationWithZod } from '../util/route_validation';
import { withAvailability } from './with_availability';
import { isErrorThatHandlesItsOwnResponse } from '../lib/errors';
import { handleCustomErrors } from './routes_util';
import { GenerationErrorCode } from '../../common/constants';

export function registerEcsRoutes(router: IRouter<IntegrationAssistantRouteHandlerContext>) {
  router.versioned
    .post({
      path: ECS_GRAPH_PATH,
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
            body: buildRouteValidationWithZod(EcsMappingRequestBody),
          },
        },
      },
      withAvailability(async (context, req, res): Promise<IKibanaResponse<EcsMappingResponse>> => {
        const {
          packageName,
          dataStreamName,
          samplesFormat,
          rawSamples,
          additionalProcessors,
          mapping,
          langSmithOptions,
        } = req.body;
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
            samplesFormat,
            additionalProcessors,
            ...(mapping && { mapping }),
          };

          const options = {
            callbacks: [
              new APMTracer({ projectName: langSmithOptions?.projectName ?? 'default' }, logger),
              ...getLangSmithTracer({ ...langSmithOptions, logger }),
            ],
          };

          const graph = await getEcsGraph({ model });
          const results = await graph.invoke(parameters, options);

          return res.ok({ body: EcsMappingResponse.parse(results) });
        } catch (err) {
          try {
            handleCustomErrors(err, GenerationErrorCode.RECURSION_LIMIT);
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
