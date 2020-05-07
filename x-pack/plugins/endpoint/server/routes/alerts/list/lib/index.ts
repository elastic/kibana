/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { decode } from 'rison-node';
import { SearchResponse } from 'elasticsearch';
import { KibanaRequest } from 'kibana/server';
import { RequestHandlerContext } from 'src/core/server';
import { Query, Filter, TimeRange } from '../../../../../../../../src/plugins/data/server';
import {
  AlertEvent,
  AlertData,
  AlertResultList,
  AlertHits,
  ESTotal,
  AlertingIndexGetQueryResult,
} from '../../../../../common/types';
import { AlertConstants } from '../../../../../common/alert_constants';
import { EndpointAppContext } from '../../../../types';
import { AlertSearchQuery } from '../../types';
import { AlertListPagination } from './pagination';

export const getRequestData = async (
  request: KibanaRequest<unknown, AlertingIndexGetQueryResult, unknown>,
  endpointAppContext: EndpointAppContext
): Promise<AlertSearchQuery> => {
  const config = await endpointAppContext.config();
  const reqData: AlertSearchQuery = {
    // Defaults not enforced by schema
    pageSize: request.query.page_size || AlertConstants.ALERT_LIST_DEFAULT_PAGE_SIZE,
    sort: request.query.sort || AlertConstants.ALERT_LIST_DEFAULT_SORT,
    order: request.query.order || 'desc',
    dateRange: ((request.query.date_range !== undefined
      ? decode(request.query.date_range)
      : config.alertResultListDefaultDateRange) as unknown) as TimeRange,

    // Filtering
    query:
      request.query.query !== undefined
        ? ((decode(request.query.query) as unknown) as Query)
        : { query: '', language: 'kuery' },
    filters:
      request.query.filters !== undefined
        ? ((decode(request.query.filters) as unknown) as Filter[])
        : ([] as Filter[]),

    // Paging
    pageIndex: request.query.page_index,
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

  if (
    reqData.searchBefore !== undefined &&
    reqData.searchBefore[0] === '' &&
    reqData.emptyStringIsUndefined
  ) {
    reqData.searchBefore[0] = AlertConstants.MAX_LONG_INT;
  }

  if (
    reqData.searchAfter !== undefined &&
    reqData.searchAfter[0] === '' &&
    reqData.emptyStringIsUndefined
  ) {
    reqData.searchAfter[0] = AlertConstants.MAX_LONG_INT;
  }

  return reqData;
};

export async function mapToAlertResultList(
  reqCtx: RequestHandlerContext,
  endpointAppContext: EndpointAppContext,
  reqData: AlertSearchQuery,
  searchResponse: SearchResponse<AlertEvent>
): Promise<AlertResultList> {
  let totalNumberOfAlerts: number = 0;
  let totalIsLowerBound: boolean = false;

  // The cast below is due to: https://github.com/elastic/kibana/issues/56694
  const total: ESTotal = (searchResponse.hits.total as unknown) as ESTotal;
  totalNumberOfAlerts = total.value || 0;
  totalIsLowerBound = total.relation === 'gte' || false;

  if (totalIsLowerBound) {
    // This shouldn't happen, as we always try to fetch enough hits to satisfy the current request and the next page.
    endpointAppContext.logFactory
      .get('alerts')
      .warn('Total hits not counted accurately. Pagination numbers may be inaccurate.');
  }

  const config = await endpointAppContext.config();
  const hits = searchResponse.hits.hits;
  const pagination: AlertListPagination = new AlertListPagination(config, reqCtx, reqData, hits);

  function mapHit(entry: AlertHits[0]): AlertData {
    return {
      id: entry._id,
      ...entry._source,
      prev: null,
      next: null,
    };
  }

  return {
    request_page_size: reqData.pageSize,
    request_page_index: reqData.pageIndex,
    result_from_index: reqData.fromIndex,
    next: await pagination.getNextUrl(),
    prev: await pagination.getPrevUrl(),
    alerts: hits.map(mapHit),
    total: totalNumberOfAlerts,
  };
}
