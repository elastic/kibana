/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KibanaRequest } from 'kibana/server';
import { esQuery } from '../../../../../../src/plugins/data/common';
import {
  JsonObject,
  fromKueryExpression,
  toElasticsearchQuery,
} from '../../../../../../src/plugins/data/common/es_query/kuery';
import { EndpointAppConstants } from '../../../common/types';
import {
  EndpointAppContext,
  AlertRequestParams,
  AlertRequestData,
  AlertRequest,
  AlertRequestBody,
} from '../../types';

function buildQuery(reqData: AlertRequestData): JsonObject {
  const queries: JsonObject[] = [];
  let dateRangeFilter: JsonObject = {};

  if (reqData.filters.length > 0) {
    const filtersQuery = esQuery.buildQueryFromFilters(reqData.filters, undefined);
    queries.push(...filtersQuery.filter);
  }

  if (reqData.query) {
    queries.push(toElasticsearchQuery(fromKueryExpression(reqData.query)));
  }

  if (reqData.dateRange) {
    dateRangeFilter = {
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
  } else if (queries.length === 0) {
    return {
      match_all: {},
    };
  }

  // Only 1 query part, so return it
  return queries[0];
}

export const buildAlertListESQuery = async (reqData: AlertRequestData): Promise<JsonObject> => {
  const DEFAULT_TOTAL_HITS = 10000;
  let totalHitsMin: number = DEFAULT_TOTAL_HITS;

  // Calculate minimum total hits set to indicate there's a next page
  // TODO: handle this for search_after?
  if (reqData.fromIndex !== undefined) {
    totalHitsMin = Math.max(reqData.fromIndex + reqData.pageSize * 2, DEFAULT_TOTAL_HITS);
  }

  const reqBody: AlertRequestBody = {
    track_total_hits: totalHitsMin,
    query: buildQuery(reqData),
    sort: [
      // User-defined primary sort, with default to `@timestamp`
      {
        [reqData.sort]: {
          order: reqData.order as 'asc' | 'desc',
        },
      },
      // Secondary sort for tie-breaking
      {
        'event.id': {
          order: reqData.order as 'asc' | 'desc',
        },
      },
    ],
  };

  const reqWrapper: AlertRequest = {
    size: reqData.pageSize,
    index: EndpointAppConstants.ALERT_INDEX_NAME,
    body: reqBody,
  };

  if (reqData.fromIndex !== undefined) {
    reqWrapper.from = reqData.fromIndex;
  }

  if (reqData.searchAfter !== undefined) {
    reqWrapper.body.search_after = reqData.searchAfter;
  }

  if (reqData.searchBefore !== undefined) {
    // Reverse sort order for search_before functionality
    const order: string = reqWrapper.body.sort[0][reqData.sort].order as string;
    if (order === 'asc') {
      reqWrapper.body.sort[0][reqData.sort].order = 'desc';
      reqWrapper.body.sort[1]['event.id'].order = 'desc';
    } else {
      reqWrapper.body.sort[0][reqData.sort].order = 'asc';
      reqWrapper.body.sort[1]['event.id'].order = 'asc';
    }

    reqWrapper.body.search_after = reqData.searchBefore;
  }

  return (reqWrapper as unknown) as JsonObject;
};

export const getRequestData = async (
  request: KibanaRequest<unknown, AlertRequestParams, AlertRequestParams>,
  endpointAppContext: EndpointAppContext
): Promise<AlertRequestData> => {
  const config = await endpointAppContext.config();
  const reqData = new AlertRequestData();

  reqData.pageIndex = request.query?.page_index;
  reqData.pageSize = request.query?.page_size || config.alertResultListDefaultPageSize;
  reqData.query = request.query?.query || config.alertResultListDefaultQuery;
  reqData.filters = request.query?.filters || config.alertResultListDefaultFilters;
  reqData.dateRange = request.query?.date_range || config.alertResultListDefaultDateRange;
  reqData.sort = request.query?.sort || config.alertResultListDefaultSort;
  reqData.order = request.query?.order || config.alertResultListDefaultOrder;
  reqData.searchAfter = request.query?.after;
  reqData.searchBefore = request.query?.before;

  if (reqData.searchAfter === undefined && reqData.searchBefore === undefined) {
    // simple pagination
    if (reqData.pageIndex === undefined) {
      reqData.pageIndex = config.alertResultListDefaultFirstPageIndex;
    }

    reqData.fromIndex = reqData.pageIndex * reqData.pageSize;
  }

  return reqData;
};
