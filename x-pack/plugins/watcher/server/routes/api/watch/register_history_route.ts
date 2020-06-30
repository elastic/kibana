/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { ILegacyScopedClusterClient } from 'kibana/server';
import { get } from 'lodash';
import { fetchAllFromScroll } from '../../../lib/fetch_all_from_scroll';
import { INDEX_NAMES, ES_SCROLL_SETTINGS } from '../../../../common/constants';
import { isEsError } from '../../../shared_imports';
import { RouteDependencies } from '../../../types';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';
// @ts-ignore
import { WatchHistoryItem } from '../../../models/watch_history_item/index';

const paramsSchema = schema.object({
  watchId: schema.string(),
});

const querySchema = schema.object({
  startTime: schema.string(),
});

function fetchHistoryItems(dataClient: ILegacyScopedClusterClient, watchId: any, startTime: any) {
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

  return dataClient
    .callAsCurrentUser('search', params)
    .then((response: any) => fetchAllFromScroll(response, dataClient));
}

export function registerHistoryRoute(deps: RouteDependencies) {
  deps.router.get(
    {
      path: '/api/watcher/watch/{watchId}/history',
      validate: {
        params: paramsSchema,
        query: querySchema,
      },
    },
    licensePreRoutingFactory(deps, async (ctx, request, response) => {
      const { watchId } = request.params;
      const { startTime } = request.query;

      try {
        const hits = await fetchHistoryItems(ctx.watcher!.client, watchId, startTime);
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
        // Case: Error from Elasticsearch JS client
        if (isEsError(e)) {
          return response.customError({ statusCode: e.statusCode, body: e });
        }

        // Case: default
        return response.internalError({ body: e });
      }
    })
  );
}
