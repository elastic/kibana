/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ILegacyScopedClusterClient } from 'kibana/server';
import { RouteDependencies } from '../../../types';

const paramsSchema = schema.object({
  watchId: schema.string(),
});

function deleteWatch(dataClient: ILegacyScopedClusterClient, watchId: string) {
  return dataClient.callAsCurrentUser('watcher.deleteWatch', {
    id: watchId,
  });
}

export function registerDeleteRoute({ router, license, lib: { isEsError } }: RouteDependencies) {
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
          body: await deleteWatch(ctx.watcher!.client, watchId),
        });
      } catch (e) {
        // Case: Error from Elasticsearch JS client
        if (isEsError(e)) {
          const body = e.statusCode === 404 ? `Watch with id = ${watchId} not found` : e;
          return response.customError({ statusCode: e.statusCode, body });
        }

        // Case: default
        throw e;
      }
    })
  );
}
