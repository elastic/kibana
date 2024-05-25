/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { RELATED_GRAPH_PATH } from '../../common';
import { RelatedApiRequest, RelatedApiResponse } from '../../common/types';
import { getRelatedGraph } from '../graphs/related';

export function registerRelatedRoutes(router: IRouter) {
  router.post(
    {
      path: `${RELATED_GRAPH_PATH}`,
      validate: {
        body: schema.object({
          packageName: schema.string(),
          dataStreamName: schema.string(),
          formSamples: schema.arrayOf(schema.string()),
          // TODO: This is a single nested object of any key or shape, any better schema?
          ingestPipeline: schema.maybe(schema.any()),
        }),
      },
    },
    async (_, req, res) => {
      const { packageName, dataStreamName, formSamples, ingestPipeline } =
        req.body as RelatedApiRequest;
      const graph = await getRelatedGraph();
      let results = { results: { docs: {}, pipeline: {} } };
      try {
        results = (await graph.invoke({
          packageName,
          dataStreamName,
          formSamples,
          ingestPipeline,
        })) as RelatedApiResponse;
      } catch (e) {
        // TODO: Better error responses?
        return e;
      }

      return res.ok({ body: results });
    }
  );
}
