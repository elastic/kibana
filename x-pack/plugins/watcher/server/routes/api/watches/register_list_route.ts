/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from 'kibana/server';
import { get } from 'lodash';
import { fetchAllFromScroll } from '../../../lib/fetch_all_from_scroll';
import { INDEX_NAMES, ES_SCROLL_SETTINGS } from '../../../../common/constants';
import { RouteDependencies } from '../../../types';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';
// @ts-ignore
import { Watch } from '../../../models/watch/index';

function fetchWatches(dataClient: IScopedClusterClient) {
  return dataClient.asCurrentUser
    .search(
      {
        index: INDEX_NAMES.WATCHES,
        scroll: ES_SCROLL_SETTINGS.KEEPALIVE,
        body: {
          size: ES_SCROLL_SETTINGS.PAGE_SIZE,
        },
      },
      { ignore: [404] }
    )
    .then(({ body: response }) => fetchAllFromScroll(response, dataClient));
}

export function registerListRoute({
  router,
  lib: { handleEsError },
  getLicenseStatus,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/watcher/watches',
      validate: false,
    },
    licensePreRoutingFactory(getLicenseStatus, async (ctx, request, response) => {
      try {
        const hits = await fetchWatches(ctx.core.elasticsearch.client);
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
            watches: watches.map((watch) => watch.downstreamJson),
          },
        });
      } catch (e) {
        return handleEsError({ error: e, response });
      }
    })
  );
}
