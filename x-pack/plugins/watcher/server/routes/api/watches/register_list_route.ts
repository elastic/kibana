/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyScopedClusterClient } from 'kibana/server';
import { get } from 'lodash';
import { fetchAllFromScroll } from '../../../lib/fetch_all_from_scroll';
import { INDEX_NAMES, ES_SCROLL_SETTINGS } from '../../../../common/constants';
import { isEsError } from '../../../shared_imports';
import { RouteDependencies } from '../../../types';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';
// @ts-ignore
import { Watch } from '../../../models/watch/index';

function fetchWatches(dataClient: ILegacyScopedClusterClient) {
  const params = {
    index: INDEX_NAMES.WATCHES,
    scroll: ES_SCROLL_SETTINGS.KEEPALIVE,
    body: {
      size: ES_SCROLL_SETTINGS.PAGE_SIZE,
    },
    ignore: [404],
  };

  return dataClient
    .callAsCurrentUser('search', params)
    .then((response: any) => fetchAllFromScroll(response, dataClient));
}

export function registerListRoute(deps: RouteDependencies) {
  deps.router.get(
    {
      path: '/api/watcher/watches',
      validate: false,
    },
    licensePreRoutingFactory(deps, async (ctx, request, response) => {
      try {
        const hits = await fetchWatches(ctx.watcher!.client);
        const watches = hits.map((hit: any) => {
          const id = get(hit, '_id');
          const watchJson = get(hit, '_source');
          const watchStatusJson = get(hit, '_source.status');

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
            watches: watches.map((watch: any) => watch.downstreamJson),
          },
        });
      } catch (e) {
        // Case: Error from Elasticsearch JS client
        if (isEsError(e)) {
          return response.customError({
            statusCode: e.statusCode,
            body: {
              message: e.message,
            },
          });
        }

        // Case: default
        return response.internalError({ body: e });
      }
    })
  );
}
