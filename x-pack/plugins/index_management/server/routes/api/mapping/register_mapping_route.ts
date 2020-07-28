/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

const paramsSchema = schema.object({
  indexName: schema.string(),
});

function formatHit(hit: { [key: string]: { mappings: any } }, indexName: string) {
  const mappings = hit[indexName].mappings;
  return {
    mappings,
  };
}

export function registerMappingRoute({ router, license, lib }: RouteDependencies) {
  router.get(
    { path: addBasePath('/mapping/{indexName}'), validate: { params: paramsSchema } },
    license.guardApiRoute(async (ctx, req, res) => {
      const { indexName } = req.params as typeof paramsSchema.type;
      const params = {
        expand_wildcards: 'none',
        index: indexName,
      };

      try {
        const hit = await ctx.core.elasticsearch.legacy.client.callAsCurrentUser(
          'indices.getMapping',
          params
        );
        const response = formatHit(hit, indexName);
        return res.ok({ body: response });
      } catch (e) {
        if (lib.isEsError(e)) {
          return res.customError({
            statusCode: e.statusCode,
            body: e,
          });
        }
        // Case: default
        return res.internalError({ body: e });
      }
    })
  );
}
