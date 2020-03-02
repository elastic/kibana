/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { decode, encode } from 'rison-node';
import { SearchResponse } from 'elasticsearch';
import { stringify } from 'query-string';
import { IScopedClusterClient, KibanaRequest } from 'kibana/server';
import { JsonObject } from '../../../../../../../src/plugins/kibana_utils/public';
import { esKuery, esQuery, Filter, TimeRange } from '../../../../../../../src/plugins/data/server';
import { AlertEvent, Direction, EndpointAppConstants } from '../../../../common/types';
import { EndpointAppContext } from '../../../types';
import {
  AlertListRequestQuery,
  AlertSearchAndSortParams,
  AlertPaginationParams,
  AlertSearchParams,
  AlertSearchRequest,
  AlertSearchRequestWrapper,
  AlertSort,
  UndefinedResultPosition,
} from '../types';
import { alertListReqSchema } from '../list/schemas';
export { Pagination } from './pagination';

/**
 * Translates API search, sort, and pagination parameters to ES-ready parameters.
 */
export const getAlertSearchParams = async (
  request: KibanaRequest<unknown, AlertListRequestQuery, unknown>,
  endpointAppContext: EndpointAppContext
): Promise<AlertSearchParams> => {
  const config = await endpointAppContext.config();
  const reqData: AlertSearchParams = {
    // Filtering
    query: request.query.query,
    filters:
      request.query.filters !== undefined
        ? ((decode(request.query.filters) as unknown) as Filter[])
        : ([] as Filter[]),
    dateRange: ((request.query.date_range !== undefined
      ? decode(request.query.date_range)
      : config.alertResultListDefaultDateRange) as unknown) as TimeRange,

    // Sorting
    sort: request.query.sort,
    order: request.query.order,

    // Paging - Simple
    pageIndex: request.query.page_index,
    pageSize: request.query.page_size,

    // Paging - Cursor-Based
    searchAfter: request.query.after,
    searchBefore: request.query.before,
    emptyStringIsUndefined: request.query.empty_string_is_undefined,
  };

  if (reqData.searchAfter === undefined && reqData.searchBefore === undefined) {
    // simple pagination
    if (reqData.pageIndex === undefined) {
      reqData.pageIndex = 0;
    }
    reqData.fromIndex = reqData.pageIndex * reqData.pageSize;
  }

  // See: https://github.com/elastic/elasticsearch-js/issues/662
  // and https://github.com/elastic/endpoint-app-team/issues/221
  if (
    reqData.searchBefore !== undefined &&
    reqData.searchBefore[0] === '' &&
    reqData.emptyStringIsUndefined
  ) {
    reqData.searchBefore[0] = EndpointAppConstants.MAX_LONG_INT;
  }

  if (
    reqData.searchAfter !== undefined &&
    reqData.searchAfter[0] === '' &&
    reqData.emptyStringIsUndefined
  ) {
    reqData.searchAfter[0] = EndpointAppConstants.MAX_LONG_INT;
  }

  return reqData;
};

export const getAlertPaginationParams = async (
  request: KibanaRequest<unknown, AlertListRequestQuery, unknown>,
  endpointAppContext: EndpointAppContext
): Promise<AlertPaginationParams> => {};

/**
 * Reverses the sort direction.
 */
function reverseSortDirection(order: Direction): Direction {
  return order === Direction.asc ? Direction.desc : Direction.asc;
}

/**
 * Builds the `query` portion of an ES query for alerts.
 */
function buildQuery(query: AlertSearchParams): JsonObject {
  const queries: JsonObject[] = [];

  // only alerts
  queries.push({
    term: {
      'event.kind': {
        value: 'alert',
      },
    },
  });

  if (query.filters !== undefined && query.filters.length > 0) {
    const filtersQuery = esQuery.buildQueryFromFilters(query.filters, undefined);
    queries.push((filtersQuery.filter as unknown) as JsonObject);
  }

  if (query.query) {
    queries.push(esKuery.toElasticsearchQuery(esKuery.fromKueryExpression(query.query)));
  }

  if (query.dateRange) {
    const dateRangeFilter: JsonObject = {
      range: {
        ['@timestamp']: {
          gte: query.dateRange.from,
          lte: query.dateRange.to,
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

/**
 * Builds an ES `sort` array, taking into account special cases of `before` requests and undefined (missing) values.
 */
function buildSort(query: AlertSearchParams): AlertSort {
  const sort: AlertSort = [
    // User-defined primary sort, with default to `@timestamp`
    {
      [query.sort]: {
        order: query.order,
        missing:
          query.order === Direction.asc
            ? UndefinedResultPosition.last
            : UndefinedResultPosition.first,
      },
    },
    // Secondary sort for tie-breaking
    {
      'event.id': {
        order: query.order,
      },
    },
  ];

  if (query.searchBefore) {
    // Reverse sort order for search_before functionality
    const newDirection = reverseSortDirection(query.order);
    sort[0][query.sort].order = newDirection;
    sort[0][query.sort].missing =
      newDirection === Direction.asc ? UndefinedResultPosition.last : UndefinedResultPosition.first;
    sort[1]['event.id'].order = newDirection;
  }

  return sort;
}

/**
 * Builds a request body for Elasticsearch, given a set of query params.
 **/
const buildAlertSearchParams = async (
  query: AlertSearchParams
): Promise<AlertSearchRequestWrapper> => {
  let totalHitsMin: number = EndpointAppConstants.DEFAULT_TOTAL_HITS;

  // Calculate minimum total hits set to indicate there's a next page
  if (query.fromIndex) {
    totalHitsMin = Math.max(
      query.fromIndex + query.pageSize * 2,
      EndpointAppConstants.DEFAULT_TOTAL_HITS
    );
  }

  const reqBody: AlertSearchRequest = {
    track_total_hits: totalHitsMin,
    query: buildQuery(query),
    sort: buildSort(query),
  };

  if (query.searchAfter) {
    reqBody.search_after = query.searchAfter;
  }

  if (query.searchBefore) {
    reqBody.search_after = query.searchBefore;
  }

  const reqWrapper: AlertSearchRequestWrapper = {
    size: query.pageSize,
    index: EndpointAppConstants.ALERT_INDEX_NAME,
    body: reqBody,
  };

  if (query.fromIndex) {
    reqWrapper.from = query.fromIndex;
  }

  return reqWrapper;
};

/**
 * Makes a request to Elasticsearch, given an `AlertSearchRequestWrapper`.
 **/
export const searchESForAlerts = async (
  dataClient: IScopedClusterClient,
  query: AlertSearchParams
): Promise<SearchResponse<AlertEvent>> => {
  const reqWrapper = await buildAlertSearchParams(query);
  const response = (await dataClient.callAsCurrentUser('search', reqWrapper)) as SearchResponse<
    AlertEvent
  >;

  if (query.searchBefore !== undefined) {
    // Reverse the hits when using `search_before`.
    response.hits.hits.reverse();
  }

  return response;
};
