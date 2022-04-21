/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../../services';

function findMatchingNodes(stats: any, nodeAttrs: string): any {
  return Object.entries(stats.nodes).reduce((accum: any[], [nodeId, nodeStats]: [any, any]) => {
    const attributes = nodeStats.attributes || {};
    for (const [key, value] of Object.entries(attributes)) {
      if (`${key}:${value}` === nodeAttrs) {
        accum.push({
          nodeId,
          stats: nodeStats,
        });
        break;
      }
    }
    return accum;
  }, []);
}

const paramsSchema = schema.object({
  nodeAttrs: schema.string(),
});

export function registerDetailsRoute({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) {
  router.get(
    { path: addBasePath('/nodes/{nodeAttrs}/details'), validate: { params: paramsSchema } },
    license.guardApiRoute(async (context, request, response) => {
      const params = request.params as typeof paramsSchema.type;
      const { nodeAttrs } = params;

      try {
        const statsResponse = await context.core.elasticsearch.client.asCurrentUser.nodes.stats();
        const okResponse = { body: findMatchingNodes(statsResponse, nodeAttrs) };
        return response.ok(okResponse);
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
}
