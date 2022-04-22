/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { addBasePath } from '../../../services';
import { RouteDependencies } from '../../../types';

export const registerDeleteRoute = ({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) => {
  router.post(
    {
      path: addBasePath('/delete'),
      validate: {
        body: schema.object({
          jobIds: schema.arrayOf(schema.string()),
        }),
      },
    },
    license.guardApiRoute(async (context, request, response) => {
      const { client: clusterClient } = (await context.core).elasticsearch;
      try {
        const { jobIds } = request.body;
        const data = await Promise.all(
          jobIds.map((id: string) => clusterClient.asCurrentUser.rollup.deleteJob({ id }))
        ).then(() => ({ success: true }));
        return response.ok({ body: data });
      } catch (err) {
        // There is an issue opened on ES to handle the following error correctly
        // https://github.com/elastic/elasticsearch/issues/42908
        // Until then we'll modify the response here.
        if (
          err?.meta &&
          err.body?.task_failures?.[0]?.reason?.reason?.includes(
            'Job must be [STOPPED] before deletion'
          )
        ) {
          err.meta.status = 400;
          err.meta.statusCode = 400;
          err.meta.displayName = 'Bad request';
          err.message = err.body.task_failures[0].reason.reason;
        }
        return handleEsError({ error: err, response });
      }
    })
  );
};
