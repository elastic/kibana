/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { decode, encode } from 'rison-node';
import { LoggerFactory } from 'kibana/server';
import { esFilters, TimeRange } from '../../../../src/plugins/data/common';
import { JsonObject } from '../../../../src/plugins/data/common/es_query/kuery';
import { EndpointConfigType } from './config';

/**
 * Request params for alert queries.
 *
 * Must match exactly the values that the API receives.
 */
export interface AlertListRequestQuery {
  page_index?: number;
  page_size?: number;
  query?: string;
  filters?: string;
  date_range: string;
  sort?: string;
  order?: string;
  after?: [any, any];
  before?: [any, any];
}

/**
 * Data about the request.
 **/
interface AlertListRequestQueryMeta {
  pageUrl: string;
}

/**
 * Request metadata for additional context.
 *
 * Internal use: contains the validated request parameters for use
 * by the application. Keys are camel-cased and do not necessarily
 * match the names of the request parameters that were passed in.
 *
 * Some additional metadata, such as `pageUrl` might be contained in
 * here as well.
 */
export interface AlertListRequestQueryInternal {
  pageSize: number;
  pageIndex?: number;
  fromIndex?: number;
  query?: string;
  filters?: esFilters.Filter[];
  dateRange?: TimeRange;
  sort: string;
  order: string;
  searchAfter?: [any, any];
  searchBefore?: [any, any];
  next?: string;
  prev?: string;

  meta: AlertListRequestQueryMeta;
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
export interface AlertListESRequestBody {
  track_total_hits: number;
  query: JsonObject;
  sort: [AlertListSortParam, AlertListSortParam];
  search_after?: [any, any];
}

/**
 * Request for alerts.
 */
export interface AlertListRequest {
  index: string;
  size: number;
  from?: number;
  body: AlertListESRequestBody;
}

type AlertHits = AlertSource[];
