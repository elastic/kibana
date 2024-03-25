/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  EXCLUDE_RUN_ONCE_FILTER,
  SUMMARY_FILTER,
} from '../../../../common/constants/client_defaults';
import { UMElasticsearchQueryFn } from '../adapters/framework';
import {
  GetPingsParams,
  HttpResponseBody,
  PingsResponse,
  Ping,
} from '../../../../common/runtime_types';

const DEFAULT_PAGE_SIZE = 25;

function isStringArray(value: unknown): value is string[] {
  if (!Array.isArray(value)) return false;
  // are all array items strings
  if (!value.some((s) => typeof s !== 'string')) return true;
  throw Error('Excluded locations can only be strings');
}

export const getPings: UMElasticsearchQueryFn<GetPingsParams, PingsResponse> = async ({
  uptimeEsClient,
  dateRange: { from, to },
  index,
  monitorId,
  status,
  sort,
  size: sizeParam,
  locations,
  excludedLocations,
}) => {
  const size = sizeParam ?? DEFAULT_PAGE_SIZE;

  const searchBody = {
    size,
    ...(index ? { from: index * size } : {}),
    query: {
      bool: {
        filter: [
          SUMMARY_FILTER,
          EXCLUDE_RUN_ONCE_FILTER,
          { range: { '@timestamp': { gte: from, lte: to } } },
          ...(monitorId ? [{ term: { 'monitor.id': monitorId } }] : []),
          ...(status ? [{ term: { 'monitor.status': status } }] : []),
        ] as QueryDslQueryContainer[],
      },
    },
    sort: [{ '@timestamp': { order: (sort ?? 'desc') as 'asc' | 'desc' } }],
    ...((locations ?? []).length > 0
      ? { post_filter: { terms: { 'observer.geo.name': locations as unknown as string[] } } }
      : {}),
  };

  // if there are excluded locations, add a clause to the query's filter
  const excludedLocationsArray: unknown = excludedLocations && JSON.parse(excludedLocations);
  if (isStringArray(excludedLocationsArray) && excludedLocationsArray.length > 0) {
    searchBody.query.bool.filter.push({
      bool: {
        must_not: [
          {
            terms: {
              'observer.geo.name': excludedLocationsArray,
            },
          },
        ],
      },
    });
  }

  const {
    body: {
      hits: { hits, total },
    },
  } = await uptimeEsClient.search({ body: searchBody });

  const pings: Ping[] = hits.map((doc: any) => {
    const { _id, _source } = doc;
    // Calculate here the length of the content string in bytes, this is easier than in client JS, where
    // we don't have access to Buffer.byteLength. There are some hacky ways to do this in the
    // client but this is cleaner.
    const httpBody: HttpResponseBody | undefined = _source?.http?.response?.body;
    if (httpBody && httpBody.content) {
      httpBody.content_bytes = Buffer.byteLength(httpBody.content);
    }

    return { ..._source, timestamp: _source['@timestamp'], docId: _id };
  });

  return {
    total: total.value,
    pings,
  };
};
