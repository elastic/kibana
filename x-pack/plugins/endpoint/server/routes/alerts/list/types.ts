/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { JsonObject } from '../../../../../../../src/plugins/data/common/es_query/kuery';

/**
 * Request params for alert queries.
 *
 * Must match exactly the values that the API receives.
 */
export interface AlertListRequestParams {
  page_index?: number;
  page_size?: number;
  filters?: string;
  query?: string;
  sort?: string;
  order?: string;
  after?: string;
  before?: string;
}

/**
 * Request metadata for additional context.
 *
 * Internal use: contains the validated request parameters for use
 * by the application. Keys are camel-cased and do not necessarily
 * match the names of the request parameters that were passed in.
 */
export interface AlertListRequestData {
  pageSize: number;
  pageIndex?: number;
  fromIndex?: number;
  filters: string;
  query: string;
  sort: string;
  order: string;
  searchAfter?: string;
  searchBefore?: string;
  next?: string;
  prev?: string;
}

/**
 * Sort parameters for alerts in ES.
 */
export interface AlertListSortParam {
  [key: string]: {
    order: 'asc' | 'desc';
  };
}

/**
 * Request body for alerts.
 */
export interface AlertListRequestBody {
  track_total_hits: number;
  query: JsonObject;
  sort: [AlertListSortParam, AlertListSortParam];
  search_after?: any;
}

/**
 * Request for alerts.
 */
export interface AlertListRequest {
  index: string;
  size: number;
  from?: number;
  body: AlertListRequestBody;
}
