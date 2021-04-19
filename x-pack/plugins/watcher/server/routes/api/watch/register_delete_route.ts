/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IScopedClusterClient } from 'kibana/server';
import { RouteDependencies } from '../../../types';

const paramsSchema = schema.object({
  watchId: schema.string(),
});

function deleteWatch(dataClient: IScopedClusterClient, watchId: string) {
  return dataClient.asCurrentUser.watcher
    .deleteWatch({
      id: watchId,
    })
    .then(({ body }) => body);
}

export function registerDeleteRoute({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) {
  router.delete(
    {
      path: '/api/watcher/watch/{watchId}',
      validate: {
        params: paramsSchema,
      },
    },
    license.guardApiRoute(async (ctx, request, response) => {
      const { watchId } = request.params;

      try {
        return response.ok({
          body: await deleteWatch(ctx.core.elasticsearch.client, watchId),
        });
      } catch (e) {
        // TODO: Figure out if this covers us sufficiently given that previous logic returned a body with "Watch with id = ${watchId} not found" previously
        return handleEsError({ error: e, response });
      }
    })
  );
}
