/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { addBasePath } from '../../../services';
import { RouteDependencies } from '../../../types';

export const registerStartRoute = ({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) => {
  router.post(
    {
      path: addBasePath('/start'),
      validate: {
        body: schema.object({
          jobIds: schema.arrayOf(schema.string()),
        }),
        query: schema.maybe(
          schema.object({
            waitForCompletion: schema.maybe(schema.string()),
          })
        ),
      },
    },
    license.guardApiRoute(async (context, request, response) => {
      const { client: clusterClient } = context.core.elasticsearch;
      try {
        const { jobIds } = request.body;

        const data = await Promise.all(
          jobIds.map((id: string) => clusterClient.asCurrentUser.rollup.startJob({ id }))
        ).then(() => ({ success: true }));
        return response.ok({ body: data });
      } catch (err) {
        // There is an issue opened on ES to handle the following error correctly
        // https://github.com/elastic/elasticsearch/issues/39845, which was addressed in 8.0
        // but not backported to 7.x because it's breaking. So we need to modify the response
        // here for 7.x.
        if (err.meta?.body?.error?.reason?.includes('Cannot start task for Rollup Job')) {
          err.meta.status = 400;
          err.meta.statusCode = 400;
          err.body.error.status = 400;
          err.body.status = 400;
          err.meta.displayName = 'Bad Request';
        }
        return handleEsError({ error: err, response });
      }
    })
  );
};
