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
import { ROUTE_HANDLER_TIMEOUT } from '../constants';

export function registerRelatedRoutes(router: IRouter) {
  router.post(
    {
      path: `${RELATED_GRAPH_PATH}`,
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
          // TODO: This is a single nested object of any key or shape, any better schema?
          currentPipeline: schema.maybe(schema.any()),
        }),
      },
    },
    async (context, req, res) => {
      const { packageName, dataStreamName, rawSamples, currentPipeline } =
        req.body as RelatedApiRequest;
      const services = await context.resolve(['core']);
      const { client } = services.core.elasticsearch;
      const graph = await getRelatedGraph(client);
      let results = { results: { docs: {}, pipeline: {} } };
      try {
        results = (await graph.invoke({
          packageName,
          dataStreamName,
          rawSamples,
          currentPipeline,
        })) as RelatedApiResponse;
      } catch (e) {
        // TODO: Better error responses?
        return e;
      }

      return res.ok({ body: results });
    }
  );
}
