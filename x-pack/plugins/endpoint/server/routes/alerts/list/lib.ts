/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';
import { encode, decode, RisonValue } from 'rison-node';
import { SearchResponse } from 'elasticsearch';
import { KibanaRequest } from 'kibana/server';
import { JsonObject } from '../../../../../../../src/plugins/kibana_utils/public';
import { Filter, TimeRange, esQuery, esKuery } from '../../../../../../../src/plugins/data/server';
import {
  EndpointAppConstants,
  AlertData,
  AlertDataWrapper,
  AlertHits,
  AlertResultList,
  Direction,
  ESTotal,
} from '../../../../common/types';
import { EndpointAppContext } from '../../../types';
import {
  AlertListRequestQuery,
  AlertListRequestQueryInternal,
  AlertListRequest,
  AlertListESRequestBody,
  AlertListSort,
} from './types';

export const getRequestData = async (
  request: KibanaRequest<unknown, AlertListRequestQuery, unknown>,
  endpointAppContext: EndpointAppContext
): Promise<AlertListRequestQueryInternal> => {
  const config = await endpointAppContext.config();
  const reqData: AlertListRequestQueryInternal = {
    // Defaults not enforced by schema
    pageSize: request.query.page_size || config.alertResultListDefaultPageSize,
    sort: request.query.sort || config.alertResultListDefaultSort,
    order: request.query.order || (config.alertResultListDefaultOrder as Direction),

    // Filtering
    query: request.query.query,
    filters:
      request.query.filters !== undefined
        ? ((decode(request.query.filters) as unknown) as Filter[])
        : ([] as Filter[]),
    dateRange: (decode(request.query.date_range) as unknown) as TimeRange,

    // Paging
    pageIndex: request.query.page_index,
    searchAfter: request.query.after,
    searchBefore: request.query?.before,
  };

  if (reqData.searchAfter === undefined && reqData.searchBefore === undefined) {
    // simple pagination
    if (reqData.pageIndex === undefined) {
      reqData.pageIndex = config.alertResultListDefaultFirstPageIndex;
    }
    reqData.fromIndex = reqData.pageIndex! * reqData.pageSize;
  }

  return reqData;
};

export function buildQuery(reqData: AlertListRequestQueryInternal): JsonObject {
  const queries: JsonObject[] = [];

  if (reqData.filters.length > 0) {
    const filtersQuery = esQuery.buildQueryFromFilters(reqData.filters, undefined);
    queries.push((filtersQuery.filter as unknown) as JsonObject);
  }

  if (reqData.query) {
    queries.push(esKuery.toElasticsearchQuery(esKuery.fromKueryExpression(reqData.query)));
  }

  if (reqData.dateRange) {
    const dateRangeFilter: JsonObject = {
      range: {
        ['@timestamp']: {
          gte: reqData.dateRange.from,
          lte: reqData.dateRange.to,
        },
      },
    };

    queries.push(dateRangeFilter);
  }

  // Optimize
  if (queries.length > 1) {
    return {
      bool: {
        must: queries,
      },
    };
  } else if (queries.length === 1) {
    return queries[0];
  }

  return {
    match_all: {},
  };
}

export function buildSort(reqData: AlertListRequestQueryInternal): AlertListSort {
  const sort: AlertListSort = [
    // User-defined primary sort, with default to `@timestamp`
    {
      [reqData.sort]: {
        order: reqData.order,
      },
    },
    // Secondary sort for tie-breaking
    {
      'event.id': {
        order: reqData.order,
      },
    },
  ];

  if (reqData.searchBefore) {
    // Reverse sort order for search_before functionality
    if (reqData.order === Direction.asc) {
      sort[0][reqData.sort].order = Direction.desc;
      sort[1]['event.id'].order = Direction.desc;
    } else {
      sort[0][reqData.sort].order = Direction.asc;
      sort[1]['event.id'].order = Direction.asc;
    }
  }

  return sort;
}

export const buildAlertListESQuery = async (
  reqData: AlertListRequestQueryInternal
): Promise<JsonObject> => {
  const DEFAULT_TOTAL_HITS = 10000;
  let totalHitsMin: number = DEFAULT_TOTAL_HITS;

  // Calculate minimum total hits set to indicate there's a next page
  if (reqData.fromIndex) {
    totalHitsMin = Math.max(reqData.fromIndex + reqData.pageSize * 2, DEFAULT_TOTAL_HITS);
  }

  const reqBody: AlertListESRequestBody = {
    track_total_hits: totalHitsMin,
    query: buildQuery(reqData),
    sort: buildSort(reqData),
  };

  if (reqData.searchAfter) {
    reqBody.search_after = reqData.searchAfter;
  }

  if (reqData.searchBefore) {
    reqBody.search_after = reqData.searchBefore;
  }

  const reqWrapper: AlertListRequest = {
    size: reqData.pageSize,
    index: EndpointAppConstants.ALERT_INDEX_NAME,
    body: reqBody,
  };

  if (reqData.fromIndex) {
    reqWrapper.from = reqData.fromIndex;
  }

  return (reqWrapper as unknown) as JsonObject;
};

function getPageUrl(reqData: AlertListRequestQueryInternal): string {
  let pageUrl: string = '/api/endpoint/alerts?';

  if (reqData.query) {
    pageUrl += `query=${reqData.query}&`;
  }

  if (reqData.filters.length > 0) {
    pageUrl += `filters=${encode((reqData.filters as unknown) as RisonValue)}&`;
  }

  pageUrl += `date_range=${encode((reqData.dateRange as unknown) as RisonValue)}&`;

  if (reqData.sort !== undefined) {
    pageUrl += `sort=${reqData.sort}&`;
  }

  if (reqData.order !== undefined) {
    pageUrl += `order=${reqData.order}&`;
  }

  pageUrl += `page_size=${reqData.pageSize}&`;

  // NOTE: `search_after` and `search_before` are appended later.

  return pageUrl.slice(0, -1); // strip trailing `&`
}

export function mapToAlertResultList(
  endpointAppContext: EndpointAppContext,
  reqData: AlertListRequestQueryInternal,
  searchResponse: SearchResponse<AlertData>
): AlertResultList {
  let totalNumberOfAlerts: number = 0;
  let totalIsLowerBound: boolean = false;

  // This case is due to: https://github.com/elastic/kibana/issues/56694
  const total: ESTotal = (searchResponse?.hits?.total as unknown) as ESTotal;
  totalNumberOfAlerts = total?.value || 0;
  totalIsLowerBound = total?.relation === 'gte' || false;

  if (totalIsLowerBound) {
    // This shouldn't happen, as we always try to fetch enough hits to satisfy the current request and the next page.
    endpointAppContext.logFactory
      .get('alerts')
      .warn('Total hits not counted accurately. Pagination numbers may be inaccurate.');
  }

  const hits: AlertHits = searchResponse?.hits?.hits;
  const hitLen: number = hits.length;

  if (reqData.searchBefore !== undefined) {
    // Reverse the hits if we used `search_before`.
    hits.reverse();
  }

  const pageUrl: string = getPageUrl(reqData);

  let next: string | null = null;
  let prev: string | null = null;

  if (reqData.searchBefore !== undefined) {
    // Reverse the hits if we used `search_before`.
    hits.reverse();
  }

  if (hitLen > 0 && hitLen <= reqData.pageSize) {
    const lastCustomSortValue: string = get(hits[hitLen - 1]._source, reqData.sort) as string;
    const lastEventId: string = hits[hitLen - 1]._source.event.id;
    next = pageUrl + '&after=' + lastCustomSortValue + '&after=' + lastEventId;
  }

  if (hitLen > 0) {
    const firstCustomSortValue: string = get(hits[0]._source, reqData.sort) as string;
    const firstEventId: string = hits[0]._source.event.id;
    prev = pageUrl + '&before=' + firstCustomSortValue + '&before=' + firstEventId;
  }

  function mapHit(entry: AlertDataWrapper): AlertData {
    return {
      id: entry._id,
      ...entry._source,
    };
  }

  return {
    request_page_size: reqData.pageSize,
    request_page_index: reqData.pageIndex,
    result_from_index: reqData.fromIndex,
    next,
    prev,
    alerts: hits.map(mapHit),
    total: totalNumberOfAlerts,
  };
}
