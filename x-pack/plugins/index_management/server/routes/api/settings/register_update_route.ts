/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

const bodySchema = schema.any();

const paramsSchema = schema.object({
  indexName: schema.string(),
});

export function registerUpdateRoute({ router, license, lib }: RouteDependencies) {
  router.put(
    {
      path: addBasePath('/settings/{indexName}'),
      validate: { body: bodySchema, params: paramsSchema },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { indexName } = req.params as typeof paramsSchema.type;
      const params = {
        ignoreUnavailable: true,
        allowNoIndices: false,
        expandWildcards: 'none',
        index: indexName,
        body: req.body,
      };

      try {
        const response = await ctx.core.elasticsearch.dataClient.callAsCurrentUser(
          'indices.putSettings',
          params
        );
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
