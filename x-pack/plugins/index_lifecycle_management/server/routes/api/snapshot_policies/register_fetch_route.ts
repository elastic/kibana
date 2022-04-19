/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../../services';

export function registerFetchRoute({ router, license, lib: { handleEsError } }: RouteDependencies) {
  router.get(
    { path: addBasePath('/snapshot_policies'), validate: false },
    license.guardApiRoute(async (context, request, response) => {
      try {
        const policiesByName =
          await context.core.elasticsearch.client.asCurrentUser.slm.getLifecycle();
        return response.ok({ body: Object.keys(policiesByName) });
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
}
