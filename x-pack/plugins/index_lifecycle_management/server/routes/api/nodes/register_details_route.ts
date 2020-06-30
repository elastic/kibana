/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { LegacyAPICaller } from 'src/core/server';

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

async function fetchNodeStats(callAsCurrentUser: LegacyAPICaller): Promise<any> {
  const params = {
    format: 'json',
  };

  return await callAsCurrentUser('nodes.stats', params);
}

const paramsSchema = schema.object({
  nodeAttrs: schema.string(),
});

export function registerDetailsRoute({ router, license, lib }: RouteDependencies) {
  router.get(
    { path: addBasePath('/nodes/{nodeAttrs}/details'), validate: { params: paramsSchema } },
    license.guardApiRoute(async (context, request, response) => {
      const params = request.params as typeof paramsSchema.type;
      const { nodeAttrs } = params;

      try {
        const stats = await fetchNodeStats(
          context.core.elasticsearch.legacy.client.callAsCurrentUser
        );
        const okResponse = { body: findMatchingNodes(stats, nodeAttrs) };
        return response.ok(okResponse);
      } catch (e) {
        if (lib.isEsError(e)) {
          return response.customError({
            statusCode: e.statusCode,
            body: e,
          });
        }
        // Case: default
        return response.internalError({ body: e });
      }
    })
  );
}
