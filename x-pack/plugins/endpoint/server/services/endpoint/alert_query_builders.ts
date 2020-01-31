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

  // Calculate minimum total hits set to indicate there's a next page
  const totalHitsMin = Math.max(reqData.fromIndex + reqData.pageSize * 2, DEFAULT_TOTAL_HITS);

  function buildQueryBody(): JSONish {
    if (reqData.filters !== '') {
      return toElasticsearchQuery(fromKueryExpression(reqData.filters)) as JSONish;
    }

    return {
      match_all: {},
    };
  }

  return {
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
    from: reqData.fromIndex,
    size: reqData.pageSize,
    index: EndpointAppConstants.ALERT_INDEX_NAME,
  };
};

export const getRequestData = async (
  request: KibanaRequest<unknown, AlertRequestParams, AlertRequestParams>,
  endpointAppContext: EndpointAppContext
): Promise<AlertRequestData> => {
  const config = await endpointAppContext.config();
  const reqData = {} as AlertRequestData;

  if (request?.route?.method === 'get') {
    reqData.pageIndex = request.query?.page_index || config.alertResultListDefaultFirstPageIndex;
    reqData.pageSize = request.query?.page_size || config.alertResultListDefaultPageSize;
    reqData.filters = request.query?.filters || config.alertResultListDefaultFilters;
  } else {
    reqData.pageIndex = request.body?.page_index || config.alertResultListDefaultFirstPageIndex;
    reqData.pageSize = request.body?.page_size || config.alertResultListDefaultPageSize;
    reqData.filters = request.body?.filters || config.alertResultListDefaultFilters;
  }

  reqData.fromIndex = reqData.pageIndex * reqData.pageSize;

  return reqData;
};
