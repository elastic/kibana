/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { ILegacyScopedClusterClient } from 'kibana/server';
import { get } from 'lodash';
import { isEsError } from '../../../shared_imports';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';

import { RouteDependencies } from '../../../types';
// @ts-ignore
import { ExecuteDetails } from '../../../models/execute_details/index';
// @ts-ignore
import { Watch } from '../../../models/watch/index';
// @ts-ignore
import { WatchHistoryItem } from '../../../models/watch_history_item/index';

const bodySchema = schema.object({
  executeDetails: schema.object({}, { unknowns: 'allow' }),
  watch: schema.object({}, { unknowns: 'allow' }),
});

function executeWatch(dataClient: ILegacyScopedClusterClient, executeDetails: any, watchJson: any) {
  const body = executeDetails;
  body.watch = watchJson;

  return dataClient.callAsCurrentUser('watcher.executeWatch', {
    body,
  });
}

export function registerExecuteRoute(deps: RouteDependencies) {
  deps.router.put(
    {
      path: '/api/watcher/watch/execute',
      validate: {
        body: bodySchema,
      },
    },
    licensePreRoutingFactory(deps, async (ctx, request, response) => {
      const executeDetails = ExecuteDetails.fromDownstreamJson(request.body.executeDetails);
      const watch = Watch.fromDownstreamJson(request.body.watch);

      try {
        const hit = await executeWatch(
          ctx.watcher!.client,
          executeDetails.upstreamJson,
          watch.watchJson
        );
        const id = get(hit, '_id');
        const watchHistoryItemJson = get(hit, 'watch_record');
        const watchId = get(hit, 'watch_record.watch_id');
        const json = {
          id,
          watchId,
          watchHistoryItemJson,
          includeDetails: true,
        };

        const watchHistoryItem = WatchHistoryItem.fromUpstreamJson(json);
        return response.ok({
          body: {
            watchHistoryItem: watchHistoryItem.downstreamJson,
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
