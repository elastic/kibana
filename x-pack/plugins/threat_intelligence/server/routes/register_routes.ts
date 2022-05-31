/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import {
  DataRequestHandlerContext,
  getRequestAbortedSignal,
  IEsSearchRequest,
} from '@kbn/data-plugin/server';

import { schema } from '@kbn/config-schema';

import { IKibanaSearchResponse } from '@kbn/data-plugin/common';
import { SERVER_SEARCH_ROUTE_PATH } from '../../common/constants';
import { Feed } from '../../common/types/Feed';

const AGGREGATION_NAME = 'feeds' as const;

export function registerServerSearchRoute(router: IRouter<DataRequestHandlerContext>) {
  router.get(
    {
      path: SERVER_SEARCH_ROUTE_PATH,
      validate: {
        query: schema.object({
          index: schema.maybe(schema.string()),
          field: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      const search = await context.search;

      const abortSignal = getRequestAbortedSignal(request.events.aborted$);

      const res = (await search
        .search(
          {
            params: {
              body: {
                query: {
                  exists: {
                    field: 'threat',
                  },
                },
                aggs: {
                  [AGGREGATION_NAME]: {
                    terms: {
                      field: 'threat.feed.name',
                    },
                    aggs: {
                      last_seen: {
                        max: {
                          field: 'event.created',
                        },
                      },
                    },
                  },
                },
              },
            },
          } as IEsSearchRequest,
          { abortSignal }
        )
        .toPromise()) as IKibanaSearchResponse;

      const buckets = res.rawResponse.aggregations[AGGREGATION_NAME].buckets;

      const feeds: Feed[] = buckets.map((bucket: any) => ({
        name: bucket.key,
        lastSeen: new Date(bucket.last_seen.value),
      }));

      return response.ok({ body: feeds });
    }
  );
}

export function registerRoutes(router: IRouter<DataRequestHandlerContext>) {
  registerServerSearchRoute(router);
}
