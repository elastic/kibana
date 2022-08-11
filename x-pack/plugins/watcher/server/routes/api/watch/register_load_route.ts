/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IScopedClusterClient } from '@kbn/core/server';
import { get } from 'lodash';
// @ts-ignore
import { Watch } from '../../../models/watch';
import { RouteDependencies } from '../../../types';

const paramsSchema = schema.object({
  id: schema.string(),
});

function fetchWatch(dataClient: IScopedClusterClient, watchId: string) {
  return dataClient.asCurrentUser.watcher.getWatch({
    id: watchId,
  });
}

export function registerLoadRoute({ router, license, lib: { handleEsError } }: RouteDependencies) {
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
        const esClient = (await ctx.core).elasticsearch.client;
        const hit = await fetchWatch(esClient, id);
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
        if (e?.statusCode === 404 && e.meta?.body?.error) {
          e.meta.body.error.reason = `Watch with id = ${id} not found`;
        }
        return handleEsError({ error: e, response });
      }
    })
  );
}
