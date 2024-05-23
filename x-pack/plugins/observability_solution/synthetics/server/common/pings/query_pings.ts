/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Field,
  QueryDslFieldAndFormat,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SortResults } from '@elastic/elasticsearch/lib/api/types';
import { SUMMARY_FILTER } from '../../../common/constants/client_defaults';
import { UptimeEsClient } from '../../lib';
import {
  GetPingsParams,
  HttpResponseBody,
  PingsResponse,
  Ping,
} from '../../../common/runtime_types';

const DEFAULT_PAGE_SIZE = 25;

function isStringArray(value: unknown): value is string[] {
  if (!Array.isArray(value)) return false;
  // are all array items strings
  if (!value.some((s) => typeof s !== 'string')) return true;
  throw Error('Excluded locations can only be strings');
}

type QueryFields = Array<QueryDslFieldAndFormat | Field>;
type GetParamsWithFields<F> = GetPingsParams & {
  fields: QueryFields;
  fieldsExtractorFn: (doc: any) => F;
};

type GetParamsWithoutFields = GetPingsParams;

interface QueryPingsSearchBody {
  size: number;
  from: number;
  query: {
    bool: {
      filter: QueryDslQueryContainer[];
    };
  };
  sort: Array<{ '@timestamp': { order: 'asc' | 'desc' } }>;
  _source: boolean;
  fields: QueryFields;
  search_after?: SortResults;
}

export async function queryPings<F>(
  params: (GetParamsWithFields<F> | GetParamsWithoutFields) & { uptimeEsClient: UptimeEsClient }
): Promise<PingsResponse | { total: number; pings: F[] }> {
  const {
    uptimeEsClient,
    dateRange: { from, to },
    index,
    monitorId,
    status,
    sort,
    size: sizeParam,
    pageIndex,
    locations,
    excludedLocations,
  } = params;
  const size = sizeParam ?? DEFAULT_PAGE_SIZE;

  const searchBody: QueryPingsSearchBody = {
    size,
    from: pageIndex !== undefined ? pageIndex * size : 0,
    ...(index ? { from: index * size } : {}),
    query: {
      bool: {
        filter: [
          SUMMARY_FILTER,
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
    _source: true,
    fields: [] as QueryFields,
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

  // If fields are queried, only query the subset of asked fields and omit _source
  if (isGetParamsWithFields(params)) {
    searchBody._source = false;
    searchBody.fields = params.fields;

    let latestTotal = 0;
    let hitCount;
    let afterKey;
    const mapPromises: Array<Promise<F[]>> = [];

    /**
     * By default Elasticsearch only returns 10k documents in a single search.
     * Users may have many thousands of documents in a given time range.
     * This procedure paginates the results and offloads excess fields in parallel.
     */
    do {
      if (afterKey) {
        searchBody.search_after = afterKey;
      }
      const {
        body: {
          hits: { hits, total },
        },
      } = await uptimeEsClient.search({ body: searchBody });
      mapPromises.push(extractFieldsFromDocs(hits, params.fieldsExtractorFn));
      hitCount = hits.length;
      latestTotal = total.value;
      if (hitCount > 0) {
        afterKey = hits[hitCount - 1].sort;
      }
    } while (hitCount === searchBody.size && searchBody.size === 10_000);

    return {
      total: latestTotal,
      pings: (await Promise.all(mapPromises)).flat(),
    };
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
}

async function extractFieldsFromDocs<Doc, Fn>(
  hits: Doc[],
  extractor: (doc: Doc) => Fn
): Promise<Fn[]> {
  return new Promise((resolve, reject) => {
    try {
      resolve(hits.map(extractor));
    } catch (e: any) {
      reject(e);
    }
  });
}

function isGetParamsWithFields<F>(
  params: GetParamsWithFields<F> | GetParamsWithoutFields
): params is GetParamsWithFields<F> {
  return (params as GetParamsWithFields<F>).fields?.length > 0;
}
