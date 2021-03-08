/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { addBasePath } from '../../../services';
import { RouteDependencies } from '../../../types';

export const registerSearchRoute = ({
  router,
  license,
  lib: { isEsError, formatEsError },
}: RouteDependencies) => {
  router.post(
    {
      path: addBasePath('/search'),
      validate: {
        body: schema.arrayOf(
          schema.object({
            index: schema.string(),
            query: schema.any(),
          })
        ),
      },
    },
    license.guardApiRoute(async (context, request, response) => {
      try {
        const requests = request.body.map(({ index, query }: { index: string; query?: any }) =>
          context.rollup.client.callAsCurrentUser('rollup.search', {
            index,
            rest_total_hits_as_int: true,
            body: query,
          })
        );
        const data = await Promise.all(requests);
        return response.ok({ body: data });
      } catch (err) {
        if (isEsError(err)) {
          return response.customError({ statusCode: err.statusCode, body: err });
        }
        throw err;
      }
    })
  );
};
