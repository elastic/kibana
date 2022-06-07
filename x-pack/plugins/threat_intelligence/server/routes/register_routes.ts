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
import { lastValueFrom } from 'rxjs';
import { API_ROUTE_SOURCES } from '../../common/constants';
import { Feed } from '../../common/types/Feed';

const AGGREGATION_NAME = 'feeds' as const;

interface ThreatSourceBucket {
  key: string;
  last_seen: { value: number };
}

interface ThreatSourcesQueryResponse {
  aggregations: {
    [AGGREGATION_NAME]: {
      buckets: ThreatSourceBucket[];
    };
  };
}

const bucketToFeed = (bucket: ThreatSourceBucket): Feed => ({
  name: bucket.key,
  lastSeen: new Date(bucket.last_seen.value),
});

const sourcesQuery = {
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
};

export function registerSourceSearchRoute(router: IRouter<DataRequestHandlerContext>) {
  router.get(
    {
      path: API_ROUTE_SOURCES,
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

      const {
        rawResponse: {
          aggregations: {
            [AGGREGATION_NAME]: { buckets },
          },
        },
      } = await lastValueFrom(
        search.search<IEsSearchRequest, IKibanaSearchResponse<ThreatSourcesQueryResponse>>(
          sourcesQuery,
          {
            abortSignal,
          }
        )
      );

      return response.ok({ body: buckets.map(bucketToFeed) });
    }
  );
}

export function registerRoutes(router: IRouter<DataRequestHandlerContext>) {
  registerSourceSearchRoute(router);
}
