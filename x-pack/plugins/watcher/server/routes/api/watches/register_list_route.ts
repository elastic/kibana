/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { get } from 'lodash';
import { fetchAllWatches } from '../../../lib/fetch_all_watches';
import { RouteDependencies } from '../../../types';
// @ts-ignore
import { Watch } from '../../../models/watch';
import { ES_SEARCH_AFTER_SETTINGS } from '../../../../common/constants/es_search_after_settings';

function fetchWatches(dataClient: IScopedClusterClient) {
  return dataClient.asCurrentUser.watcher
    .queryWatches({
      size: ES_SEARCH_AFTER_SETTINGS.PAGE_SIZE,
      sort: ES_SEARCH_AFTER_SETTINGS.SORT,
    })
    .then((body) => fetchAllWatches(dataClient, body, []));
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
        const watches = queryWatchesResponse.map((hit: any) => {
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
