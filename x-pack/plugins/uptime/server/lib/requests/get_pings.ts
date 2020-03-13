/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isRight } from 'fp-ts/lib/Either';
import { ThrowReporter } from 'io-ts/lib/ThrowReporter';
import { UMElasticsearchQueryFn } from '../adapters/framework';
import {
  HttpResponseBody,
  PingsResponse,
  PingsResponseType,
  Ping,
} from '../../../../../legacy/plugins/uptime/common/types/ping/ping';
import { INDEX_NAMES } from '../../../../../legacy/plugins/uptime/common/constants';

export interface GetPingsParams {
  /** @member dateRangeStart timestamp bounds */
  dateRangeStart: string;

  /** @member dateRangeEnd timestamp bounds */
  dateRangeEnd: string;

  /** @member monitorId optional limit by monitorId */
  monitorId?: string | null;

  /** @member status optional limit by check statuses */
  status?: string | null;

  /** @member sort optional sort by timestamp */
  sort?: string | null;

  /** @member size optional limit query size */
  size?: number | null;

  /** @member location optional location value for use in filtering*/
  location?: string | null;
}

export const getPings: UMElasticsearchQueryFn<GetPingsParams, PingsResponse> = async ({
  callES,
  dateRangeStart,
  dateRangeEnd,
  monitorId,
  status,
  sort,
  size,
  location,
}) => {
  const sortParam = { sort: [{ '@timestamp': { order: sort ?? 'desc' } }] };
  const sizeParam = size ? { size } : undefined;
  const filter: any[] = [{ range: { '@timestamp': { gte: dateRangeStart, lte: dateRangeEnd } } }];
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
  const params = {
    index: INDEX_NAMES.HEARTBEAT,
    body: {
      query: {
        ...queryContext,
      },
      ...sortParam,
      ...sizeParam,
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

  const {
    hits: { hits, total },
    aggregations: aggs,
  } = await callES('search', params);

  const locations = aggs?.locations ?? { buckets: [{ key: 'N/A', doc_count: 0 }] };

  const pings: Ping[] = hits.map(({ _id, _source }: any) => {
    const timestamp = _source['@timestamp'];

    // Calculate here the length of the content string in bytes, this is easier than in client JS, where
    // we don't have access to Buffer.byteLength. There are some hacky ways to do this in the
    // client but this is cleaner.
    const httpBody: HttpResponseBody | undefined = _source?.http?.response?.body;
    if (httpBody && httpBody.content) {
      httpBody.content_bytes = Buffer.byteLength(httpBody.content);
    }

    return { id: _id, timestamp, ..._source };
  });

  const decoded = PingsResponseType.decode({
    total: total.value,
    locations: locations.buckets.map((bucket: { key: string }) => bucket.key),
    pings,
  });
  if (isRight(decoded)) {
    return decoded.right;
  } else {
    ThrowReporter.report(decoded);
    throw new Error('Unable to parse data');
  }
};
