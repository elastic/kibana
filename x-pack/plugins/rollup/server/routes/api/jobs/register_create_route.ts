/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { addBasePath } from '../../../services';
import { RouteDependencies } from '../../../types';

export const registerCreateRoute = ({
  router,
  license,
  lib: { isEsError, formatEsError },
}: RouteDependencies) => {
  router.put(
    {
      path: addBasePath('/create'),
      validate: {
        body: schema.object({
          job: schema.object(
            {
              id: schema.string(),
            },
            { unknowns: 'allow' }
          ),
        }),
      },
    },
    license.guardApiRoute(async (context, request, response) => {
      try {
        const { id, ...rest } = request.body.job;
        // Create job.
        await context.rollup!.client.callAsCurrentUser('rollup.createJob', {
          id,
          body: rest,
        });
        // Then request the newly created job.
        const results = await context.rollup!.client.callAsCurrentUser('rollup.job', { id });
        return response.ok({ body: results.jobs[0] });
      } catch (err) {
        if (isEsError(err)) {
          return response.customError({ statusCode: err.statusCode, body: err });
        }
        throw err;
      }
    })
  );
};
