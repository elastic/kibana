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
  lib: { handleEsError },
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
      const { client: clusterClient } = context.core.elasticsearch;
      try {
        const { id, ...rest } = request.body.job;
        // Create job.
        await clusterClient.asCurrentUser.rollup.putJob({
          id,
          // @ts-expect-error type mismatch on RollupPutJobRequest.body
          body: rest,
        });
        // Then request the newly created job.
        const results = await clusterClient.asCurrentUser.rollup.getJobs({ id });
        return response.ok({ body: results.jobs[0] });
      } catch (err) {
        return handleEsError({ error: err, response });
      }
    })
  );
};
