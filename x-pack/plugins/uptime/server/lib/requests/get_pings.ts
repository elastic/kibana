/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters/framework';
import {
  GetPingsParams,
  HttpResponseBody,
  PingsResponse,
  Ping,
} from '../../../../../legacy/plugins/uptime/common/runtime_types';

const DEFAULT_PAGE_SIZE = 25;

export const getPings: UMElasticsearchQueryFn<GetPingsParams, PingsResponse> = async ({
  callES,
  dynamicSettings,
  dateRange: { from, to },
  index,
  monitorId,
  status,
  sort,
  size: sizeParam,
  location,
}) => {
  const size = sizeParam ?? DEFAULT_PAGE_SIZE;
  const sortParam = { sort: [{ '@timestamp': { order: sort ?? 'desc' } }] };
  const filter: any[] = [{ range: { '@timestamp': { gte: from, lte: to } } }];
  if (monitorId) {
    filter.push({ term: { 'monitor.id': monitorId } });
  }
  if (status) {
    filter.push({ term: { 'monitor.status': status } });
  }

  let postFilterClause = {};
  if (location) {
    postFilterClause = { post_filter: { term: { 'observer.geo.name': location } } };
  }
  const queryContext = { bool: { filter } };
  const params: any = {
    index: dynamicSettings.heartbeatIndices,
    body: {
      query: {
        ...queryContext,
      },
      ...sortParam,
      size,
      aggregations: {
        locations: {
          terms: {
            field: 'observer.geo.name',
            missing: 'N/A',
            size: 1000,
          },
        },
      },
      ...postFilterClause,
    },
  };

  if (index) {
    params.body.from = index * size;
  }

  const {
    hits: { hits, total },
    aggregations: aggs,
  } = await callES('search', params);

  const locations = aggs?.locations ?? { buckets: [{ key: 'N/A', doc_count: 0 }] };

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
    locations: locations.buckets.map((bucket: { key: string }) => bucket.key),
    pings,
  };
};
