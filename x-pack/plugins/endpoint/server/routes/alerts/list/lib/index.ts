/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SearchResponse } from 'elasticsearch';
import { RequestHandlerContext } from 'src/core/server';
import {
  AlertEvent,
  AlertData,
  AlertResultList,
  AlertHits,
  ESTotal,
} from '../../../../../common/types';
import { EndpointAppContext } from '../../../../types';
import { AlertSearchParams } from '../../types';
import { AlertListPagination } from './pagination';

export async function mapToAlertResultList(
  reqCtx: RequestHandlerContext,
  endpointAppContext: EndpointAppContext,
  reqData: AlertSearchParams,
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

  const hits = searchResponse.hits.hits;
  const pagination: AlertListPagination = new AlertListPagination(reqCtx, reqData, hits);

  function mapHit(entry: AlertHits[0]): AlertData {
    return {
      id: entry._id,
      ...entry._source,
    };
  }

  return {
    request_page_size: reqData.pageSize!,
    request_page_index: reqData.pageIndex,
    result_from_index: reqData.fromIndex,
    next: await pagination.getNextUrl(),
    prev: await pagination.getPrevUrl(),
    alerts: hits.map(mapHit),
    total: totalNumberOfAlerts,
  };
}
