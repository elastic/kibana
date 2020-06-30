/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SearchResponse } from 'elasticsearch';
import { ILegacyScopedClusterClient } from 'kibana/server';
import { AlertEvent } from '../../../../../common/endpoint/types';
import { JsonObject } from '../../../../../../../../src/plugins/kibana_utils/common';
import { esQuery } from '../../../../../../../../src/plugins/data/server';
import {
  AlertAPIOrdering,
  AlertSearchQuery,
  AlertSearchRequest,
  AlertSearchRequestWrapper,
  AlertSort,
  UndefinedResultPosition,
} from '../../../../../common/endpoint_alerts/types';
import { AlertConstants } from '../../../../../common/endpoint_alerts/alert_constants';

export { AlertIdError } from './error';
export { Pagination } from './pagination';
export { AlertId } from './alert_id';

function reverseSortDirection(order: AlertAPIOrdering): AlertAPIOrdering {
  if (order === 'asc') {
    return 'desc';
  }
  return 'asc';
}

function buildQuery(query: AlertSearchQuery): JsonObject {
  const alertKindClause = {
    term: {
      'event.kind': {
        value: 'alert',
      },
    },
  };
  const dateRangeClause = query.dateRange
    ? [
        {
          range: {
            '@timestamp': {
              gte: query.dateRange.from,
              lte: query.dateRange.to,
            },
          },
        },
      ]
    : [];
  const queryAndFiltersClauses = esQuery.buildEsQuery(undefined, query.query, query.filters);

  const fullQuery = {
    ...queryAndFiltersClauses,
    bool: {
      ...queryAndFiltersClauses.bool,
      must: [...queryAndFiltersClauses.bool.must, alertKindClause, ...dateRangeClause],
    },
  };

  // Optimize
  if (fullQuery.bool.must.length > 1) {
    return (fullQuery as unknown) as JsonObject;
  }

  return alertKindClause;
}

function buildSort(query: AlertSearchQuery): AlertSort {
  const sort: AlertSort = [
    // User-defined primary sort, with default to `@timestamp`
    {
      [query.sort]: {
        order: query.order,
        missing:
          query.order === 'asc' ? UndefinedResultPosition.last : UndefinedResultPosition.first,
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
      newDirection === 'asc' ? UndefinedResultPosition.last : UndefinedResultPosition.first;
    sort[1]['event.id'].order = newDirection;
  }

  return sort;
}

/**
 * Builds a request body for Elasticsearch, given a set of query params.
 **/
const buildAlertSearchQuery = async (
  query: AlertSearchQuery,
  indexPattern: string
): Promise<AlertSearchRequestWrapper> => {
  let totalHitsMin: number = AlertConstants.DEFAULT_TOTAL_HITS;

  // Calculate minimum total hits set to indicate there's a next page
  if (query.fromIndex) {
    totalHitsMin = Math.max(
      query.fromIndex + query.pageSize * 2,
      AlertConstants.DEFAULT_TOTAL_HITS
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
    index: indexPattern,
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
  dataClient: ILegacyScopedClusterClient,
  query: AlertSearchQuery,
  indexPattern: string
): Promise<SearchResponse<AlertEvent>> => {
  const reqWrapper = await buildAlertSearchQuery(query, indexPattern);
  const response = (await dataClient.callAsCurrentUser('search', reqWrapper)) as SearchResponse<
    AlertEvent
  >;

  if (query.searchBefore !== undefined) {
    // Reverse the hits when using `search_before`.
    response.hits.hits.reverse();
  }

  return response;
};
