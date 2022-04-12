/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { get } from 'lodash';
import { IScopedClusterClient } from 'kibana/server';
import { INDEX_NAMES } from '../../../common/constants';
import { RouteDependencies } from '../../types';
// @ts-ignore
import { WatchHistoryItem } from '../../models/watch_history_item/index';

const paramsSchema = schema.object({
  id: schema.string(),
});

function fetchHistoryItem(dataClient: IScopedClusterClient, watchHistoryItemId: string) {
  return dataClient.asCurrentUser.search({
    index: INDEX_NAMES.WATCHER_HISTORY,
    body: {
      query: {
        bool: {
          must: [{ term: { _id: watchHistoryItemId } }],
        },
      },
    },
  });
}

export function registerLoadHistoryRoute({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) {
  router.get(
    {
      path: '/api/watcher/history/{id}',
      validate: {
        params: paramsSchema,
      },
    },
    license.guardApiRoute(async (ctx, request, response) => {
      const id = request.params.id;

      try {
        const esClient = (await ctx.core).elasticsearch.client;
        const responseFromES = await fetchHistoryItem(esClient, id);
        const hit = get(responseFromES, 'hits.hits[0]');
        if (!hit) {
          return response.notFound({ body: `Watch History Item with id = ${id} not found` });
        }
        const watchHistoryItemJson = get(hit, '_source');
        const watchId = get(hit, '_source.watch_id');
        const json = {
          id,
          watchId,
          watchHistoryItemJson,
          includeDetails: true,
        };

        const watchHistoryItem = WatchHistoryItem.fromUpstreamJson(json);
        return response.ok({
          body: { watchHistoryItem: watchHistoryItem.downstreamJson },
        });
      } catch (e) {
        return handleEsError({ error: e, response });
      }
    })
  );
}
