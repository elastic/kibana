/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { TEST_PIPELINE_PATH } from '../../common';
import { testPipeline } from '../util/pipeline';
import { TestPipelineApiRequest, TestPipelineApiResponse } from '../../common/types';

export function registerEcsRoutes(router: IRouter) {
  router.post(
    {
      path: `${TEST_PIPELINE_PATH}`,
      validate: {
        body: schema.object({
          pipeline: schema.any(),
          rawSamples: schema.arrayOf(schema.string()),
        }),
      },
    },
    async (context, req, res) => {
      const { rawSamples, pipeline } = req.body as TestPipelineApiRequest;
      const services = await context.resolve(['core']);
      const { client } = services.core.elasticsearch;
      let results: TestPipelineApiResponse = { pipelineResults: [], errors: [] };
      try {
        results = (await testPipeline(rawSamples, pipeline, client)) as TestPipelineApiResponse;
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
