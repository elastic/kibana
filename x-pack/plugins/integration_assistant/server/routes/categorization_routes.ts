/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { CATEGORIZATION_GRAPH_PATH } from '../../common';
import type { CategorizationApiRequest, CategorizationApiResponse } from '../../common';
import { getCategorizationGraph } from '../graphs/categorization';
import { ROUTE_HANDLER_TIMEOUT } from '../constants';

export function registerCategorizationRoutes(router: IRouter) {
  router.post(
    {
      path: `${CATEGORIZATION_GRAPH_PATH}`,
      options: {
        timeout: {
          idleSocket: ROUTE_HANDLER_TIMEOUT,
        },
      },
      validate: {
        body: schema.object({
          packageName: schema.string(),
          dataStreamName: schema.string(),
          rawSamples: schema.arrayOf(schema.string()),
          currentPipeline: schema.any(),
        }),
      },
    },
    async (_, req, res) => {
      const { packageName, dataStreamName, rawSamples, currentPipeline } =
        req.body as CategorizationApiRequest;
      const graph = await getCategorizationGraph();
      let results = { results: { docs: {}, pipeline: {} } };
      try {
        results = (await graph.invoke({
          packageName,
          dataStreamName,
          rawSamples,
          currentPipeline,
        })) as CategorizationApiResponse;
      } catch (e) {
        // TODO: Better error responses?
        return e;
      }

      return res.ok({ body: results });
    }
  );
}
