/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KibanaRequest } from 'kibana/server';
import { EndpointAppConstants } from '../../../common/types';
import { EndpointAppContext, AlertRequestParams, JSONish } from '../../types';

export const buildAlertListESQuery = async (
  pagingProperties: Record<string, number>
): Promise<JSONish> => {
  const DEFAULT_TOTAL_HITS = 10000;

  // Calculate minimum total hits set to indicate there's a next page
  const totalHitsMin = Math.max(
    pagingProperties.fromIndex + pagingProperties.pageSize * 2,
    DEFAULT_TOTAL_HITS
  );

  return {
    body: {
      track_total_hits: totalHitsMin,
      query: {
        match_all: {},
      },
      sort: [
        {
          '@timestamp': {
            order: 'desc',
          },
        },
      ],
    },
    from: pagingProperties.fromIndex,
    size: pagingProperties.pageSize,
    index: EndpointAppConstants.ALERT_INDEX_NAME,
  };
};

export const getPagingProperties = async (
  request: KibanaRequest<unknown, AlertRequestParams, AlertRequestParams>,
  endpointAppContext: EndpointAppContext
): Promise<Record<string, number>> => {
  const config = await endpointAppContext.config();
  const pagingProperties: { page_size?: number; page_index?: number } = {};

  if (request?.route?.method === 'get') {
    pagingProperties.page_index = request.query?.page_index;
    pagingProperties.page_size = request.query?.page_size;
  } else {
    pagingProperties.page_index = request.body?.page_index;
    pagingProperties.page_size = request.body?.page_size;
  }

  const pageSize = pagingProperties.page_size || config.alertResultListDefaultPageSize;
  const pageIndex = pagingProperties.page_index || config.alertResultListDefaultFirstPageIndex;
  const fromIndex = pageIndex * pageSize;

  return { pageSize, pageIndex, fromIndex };
};
