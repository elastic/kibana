/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { ECS_GRAPH_PATH } from '../../common';
import { EcsMappingApiRequest, EcsMappingApiResponse } from '../../common/types';
import { getEcsGraph } from '../graphs/ecs';
import { ROUTE_HANDLER_TIMEOUT } from '../constants';

export function registerEcsRoutes(router: IRouter) {
  router.post(
    {
      path: `${ECS_GRAPH_PATH}`,
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
          mapping: schema.maybe(schema.any()),
        }),
      },
    },
    async (_, req, res) => {
      const { packageName, dataStreamName, rawSamples, mapping } = req.body as EcsMappingApiRequest;
      const graph = await getEcsGraph();
      let results = { results: { mapping: {}, pipeline: {} } };
      try {
        if (req.body?.mapping) {
          results = (await graph.invoke({
            packageName,
            dataStreamName,
            rawSamples,
            mapping,
          })) as EcsMappingApiResponse;
        } else
          results = (await graph.invoke({
            packageName,
            dataStreamName,
            rawSamples,
          })) as EcsMappingApiResponse;
      } catch (e) {
        return res.badRequest({ body: e });
      }

      return res.ok({ body: results });
    }
  );
}
