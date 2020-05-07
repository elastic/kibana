/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { fetchIndices } from '../../../lib/fetch_indices';
import { addBasePath } from '../index';

const bodySchema = schema.maybe(
  schema.object({
    indexNames: schema.maybe(schema.arrayOf(schema.string())),
  })
);

export function registerReloadRoute({
  router,
  license,
  indexDataEnricher,
  lib,
}: RouteDependencies) {
  router.post(
    { path: addBasePath('/indices/reload'), validate: { body: bodySchema } },
    license.guardApiRoute(async (ctx, req, res) => {
      const { indexNames = [] } = (req.body as typeof bodySchema.type) ?? {};

      try {
        const indices = await fetchIndices(
          ctx.core.elasticsearch.dataClient.callAsCurrentUser,
          indexDataEnricher,
          indexNames
        );
        return res.ok({ body: indices });
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
