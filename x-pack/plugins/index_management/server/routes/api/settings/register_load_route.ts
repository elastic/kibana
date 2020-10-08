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

// response comes back as { [indexName]: { ... }}
// so plucking out the embedded object
function formatHit(hit: { [key: string]: {} }) {
  const key = Object.keys(hit)[0];
  return hit[key];
}

export function registerLoadRoute({ router, license, lib }: RouteDependencies) {
  router.get(
    { path: addBasePath('/settings/{indexName}'), validate: { params: paramsSchema } },
    license.guardApiRoute(async (ctx, req, res) => {
      const { indexName } = req.params as typeof paramsSchema.type;
      const params = {
        expandWildcards: 'none',
        flatSettings: false,
        local: false,
        includeDefaults: true,
        index: indexName,
      };

      try {
        const hit = await ctx.core.elasticsearch.legacy.client.callAsCurrentUser(
          'indices.getSettings',
          params
        );
        return res.ok({ body: formatHit(hit) });
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
