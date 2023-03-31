/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { get } from 'lodash';
import { RouteDependencies } from '../../../types';
// @ts-ignore
import { Watch } from '../../../models/watch';

function fetchWatches(dataClient: IScopedClusterClient) {
  return dataClient.asCurrentUser.watcher.queryWatches();
}

export function registerListRoute({ router, license, lib: { handleEsError } }: RouteDependencies) {
  router.get(
    {
      path: '/api/watcher/watches',
      validate: false,
    },
    license.guardApiRoute(async (ctx, request, response) => {
      try {
        const esClient = (await ctx.core).elasticsearch.client;
        const queryWatchesResponse = await fetchWatches(esClient);
        const watches = queryWatchesResponse.watches.map((hit: any) => {
          const id = get(hit, '_id');
          const watchJson = get(hit, 'watch');
          const watchStatusJson = get(hit, 'status');

          return Watch.fromUpstreamJson(
            {
              id,
              watchJson,
              watchStatusJson,
            },
            {
              throwExceptions: {
                Action: false,
              },
            }
          );
        });

        return response.ok({
          body: {
            watches: watches.map((watch) => watch.downstreamJson),
          },
        });
      } catch (e) {
        return handleEsError({ error: e, response });
      }
    })
  );
}
