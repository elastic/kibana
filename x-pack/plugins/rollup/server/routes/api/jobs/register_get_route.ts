/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { addBasePath } from '../../../services';
import { RouteDependencies } from '../../../types';

export const registerGetRoute = ({
  router,
  license,
  lib: { isEsError, formatEsError },
}: RouteDependencies) => {
  router.get(
    {
      path: addBasePath('/jobs'),
      validate: false,
    },
    license.guardApiRoute(async (context, request, response) => {
      try {
        const data = await context.rollup!.client.callAsCurrentUser('rollup.jobs');
        return response.ok({ body: data });
      } catch (err) {
        if (isEsError(err)) {
          return response.customError({ statusCode: err.statusCode, body: err });
        }
        return response.internalError({ body: err });
      }
    })
  );
};
