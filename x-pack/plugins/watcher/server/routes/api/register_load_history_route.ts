/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { get } from 'lodash';
import { ILegacyScopedClusterClient } from 'kibana/server';
import { isEsError } from '../../shared_imports';
import { INDEX_NAMES } from '../../../common/constants';
import { RouteDependencies } from '../../types';
import { licensePreRoutingFactory } from '../../lib/license_pre_routing_factory';
// @ts-ignore
import { WatchHistoryItem } from '../../models/watch_history_item/index';

const paramsSchema = schema.object({
  id: schema.string(),
});

function fetchHistoryItem(dataClient: ILegacyScopedClusterClient, watchHistoryItemId: string) {
  return dataClient.callAsCurrentUser('search', {
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

export function registerLoadHistoryRoute(deps: RouteDependencies) {
  deps.router.get(
    {
      path: '/api/watcher/history/{id}',
      validate: {
        params: paramsSchema,
      },
    },
    licensePreRoutingFactory(deps, async (ctx, request, response) => {
      const id = request.params.id;

      try {
        const responseFromES = await fetchHistoryItem(ctx.watcher!.client, id);
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
