/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SearchResponse } from 'elasticsearch';
import { KibanaRequest } from 'kibana/server';
import {
  JsonObject,
  fromKueryExpression,
  toElasticsearchQuery,
} from '../../../../../../../src/plugins/data/common/es_query/kuery';
import {
  EndpointAppConstants,
  AlertData,
  AlertDataWrapper,
  AlertHits,
  AlertResultList,
  ESTotal,
} from '../../../../common/types';
import { EndpointAppContext } from '../../../types';
import {
  AlertListRequestParams,
  AlertListRequestData,
  AlertListRequest,
  AlertListRequestBody,
} from './types';

export const getRequestData = async (
  request: KibanaRequest<unknown, AlertListRequestParams, AlertListRequestParams>,
  endpointAppContext: EndpointAppContext
): Promise<AlertListRequestData> => {
  const config = await endpointAppContext.config();
  const reqData = {} as AlertListRequestData;

  if (request?.route?.method === 'get') {
    reqData.pageIndex = request.query?.page_index;
    reqData.pageSize = request.query?.page_size || config.alertResultListDefaultPageSize;
    reqData.filters = request.query?.filters || config.alertResultListDefaultFilters;
    reqData.query = request.query?.query || config.alertResultListDefaultQuery;
    reqData.sort = request.query?.sort || config.alertResultListDefaultSort;
    reqData.order = request.query?.order || config.alertResultListDefaultOrder;
    reqData.searchAfter = request.query?.after;
    reqData.searchBefore = request.query?.before;
  } else {
    reqData.pageIndex = request.body?.page_index;
    reqData.pageSize = request.body?.page_size || config.alertResultListDefaultPageSize;
    reqData.filters = request.body?.filters || config.alertResultListDefaultFilters;
    reqData.query = request.body?.query || config.alertResultListDefaultQuery;
    reqData.sort = request.body?.sort || config.alertResultListDefaultSort;
    reqData.order = request.body?.order || config.alertResultListDefaultOrder;
    reqData.searchAfter = request.body?.after;
    reqData.searchBefore = request.body?.before;
  }

  if (reqData.searchAfter === undefined && reqData.searchBefore === undefined) {
    // simple pagination
    if (reqData.pageIndex === undefined) {
      reqData.pageIndex = config.alertResultListDefaultFirstPageIndex;
    }

    reqData.fromIndex = reqData.pageIndex * reqData.pageSize;
  }

  return reqData;
};

export function buildQuery(reqData: AlertListRequestData): JsonObject {
  const queries: JsonObject[] = [];

  if (reqData.filters) {
    queries.push(toElasticsearchQuery(fromKueryExpression(reqData.filters)));
  }

  if (reqData.query) {
    queries.push(toElasticsearchQuery(fromKueryExpression(reqData.query)));
  }

  // Optimize
  if (queries.length > 1) {
    return {
      bool: {
        must: [queries[0], queries[1]],
      },
    };
  } else if (queries.length === 0) {
    return {
      match_all: {},
    };
  }

  return queries[0];
}

export const buildAlertListESQuery = async (reqData: AlertListRequestData): Promise<JsonObject> => {
  const DEFAULT_TOTAL_HITS = 10000;
  let totalHitsMin: number = DEFAULT_TOTAL_HITS;

  // Calculate minimum total hits set to indicate there's a next page
  // TODO: handle this for search_after?
  if (reqData.fromIndex !== undefined) {
    totalHitsMin = Math.max(reqData.fromIndex + reqData.pageSize * 2, DEFAULT_TOTAL_HITS);
  }

  const reqBody: AlertListRequestBody = {
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

  const reqWrapper: AlertListRequest = {
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

export function mapToAlertResultList(
  endpointAppContext: EndpointAppContext,
  reqData: AlertListRequestData,
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

  const firstTimestamp: Date = hits[0]._source['@timestamp'];
  const lastTimestamp: Date = hits[hitLen - 1]._source['@timestamp'];

  const firstEventId: number = hits[0]._source.event.id;
  const lastEventId: number = hits[hitLen - 1]._source.event.id;

  let pageUrl: string = '/api/endpoint/alerts?';
  pageUrl +=
    'filters=' +
    reqData.filters +
    '&page_size=' +
    reqData.pageSize +
    '&sort=' +
    reqData.sort +
    '&order=' +
    reqData.order;

  let next: string = pageUrl;
  let prev: string = pageUrl;

  next += '&after=' + lastTimestamp + '&after=' + lastEventId;
  prev += '&before=' + firstTimestamp + '&before=' + firstEventId;

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
