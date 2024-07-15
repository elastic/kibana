/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, IRouter } from '@kbn/core/server';
import { CheckPipelineRequestBody, CheckPipelineResponse, CHECK_PIPELINE_PATH } from '../../common';
import { ROUTE_HANDLER_TIMEOUT } from '../constants';
import type { IntegrationAssistantRouteHandlerContext } from '../plugin';
import { testPipeline } from '../util/pipeline';
import { buildRouteValidationWithZod } from '../util/route_validation';
import { withAvailability } from './with_availability';

export function registerPipelineRoutes(router: IRouter<IntegrationAssistantRouteHandlerContext>) {
  router.versioned
    .post({
      path: CHECK_PIPELINE_PATH,
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
            body: buildRouteValidationWithZod(CheckPipelineRequestBody),
          },
        },
      },
      withAvailability(
        async (context, req, res): Promise<IKibanaResponse<CheckPipelineResponse>> => {
          const { rawSamples, pipeline } = req.body;
          const services = await context.resolve(['core']);
          const { client } = services.core.elasticsearch;
          try {
            const { errors, pipelineResults } = await testPipeline(rawSamples, pipeline, client);
            if (errors?.length) {
              return res.badRequest({ body: JSON.stringify(errors) });
            }
            return res.ok({
              body: CheckPipelineResponse.parse({ results: { docs: pipelineResults } }),
            });
          } catch (e) {
            return res.badRequest({ body: e });
          }
        }
      )
    );
}
