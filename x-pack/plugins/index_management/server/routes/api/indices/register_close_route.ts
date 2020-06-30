/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

const bodySchema = schema.object({
  indices: schema.arrayOf(schema.string()),
});

export function registerCloseRoute({ router, license, lib }: RouteDependencies) {
  router.post(
    { path: addBasePath('/indices/close'), validate: { body: bodySchema } },
    license.guardApiRoute(async (ctx, req, res) => {
      const payload = req.body as typeof bodySchema.type;
      const { indices = [] } = payload;

      const params = {
        expandWildcards: 'none',
        format: 'json',
        index: indices,
      };

      try {
        await ctx.core.elasticsearch.legacy.client.callAsCurrentUser('indices.close', params);
        return res.ok();
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
