/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEsSearchRequest, IKibanaSearchResponse } from '@kbn/data-plugin/common';

import { IScopedSearchClient } from '@kbn/data-plugin/server';
import { lastValueFrom } from 'rxjs';

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

/**
 * Find threat sources based on received indicators
 */
export async function findSources(
  search: IScopedSearchClient,
  abortSignal?: AbortSignal
): Promise<Feed[]> {
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

  return buckets.map(bucketToFeed);
}
