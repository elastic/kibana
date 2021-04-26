/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ILegacyScopedClusterClient } from 'kibana/server';
import { get } from 'lodash';
// @ts-ignore
import { Watch } from '../../../models/watch/index';
import { RouteDependencies } from '../../../types';

const paramsSchema = schema.object({
  id: schema.string(),
});

function fetchWatch(dataClient: ILegacyScopedClusterClient, watchId: string) {
  return dataClient.callAsCurrentUser('watcher.getWatch', {
    id: watchId,
  });
}

export function registerLoadRoute({ router, license, lib: { isEsError } }: RouteDependencies) {
  router.get(
    {
      path: '/api/watcher/watch/{id}',
      validate: {
        params: paramsSchema,
      },
    },
    license.guardApiRoute(async (ctx, request, response) => {
      const id = request.params.id;

      try {
        const hit = await fetchWatch(ctx.watcher!.client, id);
        const watchJson = get(hit, 'watch');
        const watchStatusJson = get(hit, 'status');
        const json = {
          id,
          watchJson,
          watchStatusJson,
        };

        const watch = Watch.fromUpstreamJson(json, {
          throwExceptions: {
            Action: false,
          },
        });
        return response.ok({
          body: { watch: watch.downstreamJson },
        });
      } catch (e) {
        // Case: Error from Elasticsearch JS client
        if (isEsError(e)) {
          const body = e.statusCode === 404 ? `Watch with id = ${id} not found` : e;
          return response.customError({ statusCode: e.statusCode, body });
        }

        // Case: default
        throw e;
      }
    })
  );
}
