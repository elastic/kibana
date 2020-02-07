/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KibanaRequest } from 'kibana/server';
import {
  fromKueryExpression,
  toElasticsearchQuery,
} from '../../../../../../src/plugins/data/common/es_query/kuery/ast';
import { EndpointAppConstants } from '../../../common/types';
import { EndpointAppContext, AlertRequestParams, AlertRequestData, JSONish } from '../../types';

export const buildAlertListESQuery = async (reqData: AlertRequestData): Promise<JSONish> => {
  const DEFAULT_TOTAL_HITS = 10000;
  let totalHitsMin: number = DEFAULT_TOTAL_HITS;

  // Calculate minimum total hits set to indicate there's a next page
  // TODO: handle this for search_after?
  if (reqData.fromIndex !== undefined) {
    totalHitsMin = Math.max(reqData.fromIndex + reqData.pageSize * 2, DEFAULT_TOTAL_HITS);
  }

  function buildQueryBody(): JSONish {
    if (reqData.filters !== '') {
      return toElasticsearchQuery(fromKueryExpression(reqData.filters)) as JSONish;
    }

    return {
      match_all: {},
    };
  }

  const reqBody: JSONish = {
    body: {
      track_total_hits: totalHitsMin,
      query: buildQueryBody(),
      sort: [
        {
          '@timestamp': {
            order: 'desc',
          },
        },
      ],
    },
    size: reqData.pageSize,
    index: EndpointAppConstants.ALERT_INDEX_NAME,
  };

  if (reqData.fromIndex !== undefined) {
    reqBody.from = reqData.fromIndex;
  }

  return reqBody;
};

export const getRequestData = async (
  request: KibanaRequest<unknown, AlertRequestParams, AlertRequestParams>,
  endpointAppContext: EndpointAppContext
): Promise<AlertRequestData> => {
  const config = await endpointAppContext.config();
  const reqData = {} as AlertRequestData;

  if (request?.route?.method === 'get') {
    reqData.pageIndex = request.query?.page_index;
    reqData.pageSize = request.query?.page_size || config.alertResultListDefaultPageSize;
    reqData.filters = request.query?.filters || config.alertResultListDefaultFilters;
    reqData.sort = request.query?.sort || config.alertResultListDefaultSort;
    reqData.order = request.query?.order || config.alertResultListDefaultOrder;
    reqData.searchAfter = request.query?.search_after;
    reqData.searchBefore = request.query?.search_before;
  } else {
    reqData.pageIndex = request.body?.page_index;
    reqData.pageSize = request.body?.page_size || config.alertResultListDefaultPageSize;
    reqData.filters = request.body?.filters || config.alertResultListDefaultFilters;
    reqData.sort = request.body?.sort || config.alertResultListDefaultSort;
    reqData.order = request.body?.order || config.alertResultListDefaultOrder;
    reqData.searchAfter = request.body?.search_after;
    reqData.searchBefore = request.body?.search_before;
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
