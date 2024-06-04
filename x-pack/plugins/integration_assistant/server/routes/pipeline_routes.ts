/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { CHECK_PIPELINE_PATH } from '../../common';
import { testPipeline } from '../util/pipeline';
import type { CheckPipelineApiRequest, CheckPipelineApiResponse } from '../../common/types';
import type { IntegrationAssistantRouteHandlerContext } from '../plugin';

export function registerPipelineRoutes(router: IRouter<IntegrationAssistantRouteHandlerContext>) {
  router.post(
    {
      path: `${CHECK_PIPELINE_PATH}`,
      validate: {
        body: schema.object({
          pipeline: schema.any(),
          rawSamples: schema.arrayOf(schema.string()),
        }),
      },
    },
    async (context, req, res) => {
      const { rawSamples, pipeline } = req.body as CheckPipelineApiRequest;
      const services = await context.resolve(['core']);
      const { client } = services.core.elasticsearch;
      let results: CheckPipelineApiResponse = { pipelineResults: [], errors: [] };
      try {
        results = (await testPipeline(rawSamples, pipeline, client)) as CheckPipelineApiResponse;
        if (results?.errors && results.errors.length > 0) {
          return res.badRequest({ body: JSON.stringify(results.errors) });
        }
      } catch (e) {
        return res.badRequest({ body: e });
      }

      return res.ok({ body: results });
    }
  );
}
