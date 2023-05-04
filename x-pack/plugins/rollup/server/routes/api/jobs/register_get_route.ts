/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addBasePath } from '../../../services';
import { RouteDependencies } from '../../../types';

export const registerGetRoute = ({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) => {
  router.get(
    {
      path: addBasePath('/jobs'),
      validate: false,
    },
    license.guardApiRoute(async (context, request, response) => {
      const { client: clusterClient } = (await context.core).elasticsearch;
      try {
        const data = await clusterClient.asCurrentUser.rollup.getJobs({ id: '_all' });
        return response.ok({ body: data });
      } catch (err) {
        return handleEsError({ error: err, response });
      }
    })
  );
};
