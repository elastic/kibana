/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IScopedClusterClient } from 'kibana/server';
import { get } from 'lodash';
import { fetchAllFromScroll } from '../../../lib/fetch_all_from_scroll';
import { INDEX_NAMES, ES_SCROLL_SETTINGS } from '../../../../common/constants';
import { RouteDependencies } from '../../../types';
// @ts-ignore
import { WatchHistoryItem } from '../../../models/watch_history_item/index';

const paramsSchema = schema.object({
  watchId: schema.string(),
});

const querySchema = schema.object({
  startTime: schema.string(),
});

function fetchHistoryItems(dataClient: IScopedClusterClient, watchId: any, startTime: any) {
  const params: any = {
    index: INDEX_NAMES.WATCHER_HISTORY,
    scroll: ES_SCROLL_SETTINGS.KEEPALIVE,
    body: {
      size: ES_SCROLL_SETTINGS.PAGE_SIZE,
      sort: [{ 'result.execution_time': 'desc' }],
      query: {
        bool: {
          must: [{ term: { watch_id: watchId } }],
        },
      },
    },
  };

  // Add time range clause to query if startTime is specified
  if (startTime !== 'all') {
    const timeRangeQuery = { range: { 'result.execution_time': { gte: startTime } } };
    params.body.query.bool.must.push(timeRangeQuery);
  }

  return dataClient.asCurrentUser
    .search(params)
    .then((response) => fetchAllFromScroll(response, dataClient));
}

export function registerHistoryRoute({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) {
  router.get(
    {
      path: '/api/watcher/watch/{watchId}/history',
      validate: {
        params: paramsSchema,
        query: querySchema,
      },
    },
    license.guardApiRoute(async (ctx, request, response) => {
      const { watchId } = request.params;
      const { startTime } = request.query;

      try {
        const esClient = (await ctx.core).elasticsearch.client;
        const hits = await fetchHistoryItems(esClient, watchId, startTime);
        const watchHistoryItems = hits.map((hit: any) => {
          const id = get(hit, '_id');
          const watchHistoryItemJson = get(hit, '_source');

          const opts = { includeDetails: false };
          return WatchHistoryItem.fromUpstreamJson(
            {
              id,
              watchId,
              watchHistoryItemJson,
            },
            opts
          );
        });

        return response.ok({
          body: {
            watchHistoryItems: watchHistoryItems.map(
              (watchHistoryItem: any) => watchHistoryItem.downstreamJson
            ),
          },
        });
      } catch (e) {
        return handleEsError({ error: e, response });
      }
    })
  );
}
