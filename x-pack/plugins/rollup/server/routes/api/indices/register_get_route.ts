/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addBasePath } from '../../../services';
import { RouteDependencies } from '../../../types';

/**
 * Returns a list of all rollup index names
 */
export const registerGetRoute = ({
  router,
  license,
  lib: { isEsError, formatEsError, getCapabilitiesForRollupIndices },
}: RouteDependencies) => {
  router.get(
    {
      path: addBasePath('/indices'),
      validate: false,
    },
    license.guardApiRoute(async (context, request, response) => {
      try {
        const data = await context.rollup!.client.callAsCurrentUser(
          'rollup.rollupIndexCapabilities',
          {
            indexPattern: '_all',
          }
        );
        return response.ok({ body: getCapabilitiesForRollupIndices(data) });
      } catch (err) {
        if (isEsError(err)) {
          return response.customError({ statusCode: err.statusCode, body: err });
        }
        throw err;
      }
    })
  );
};
