/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LoggerFactory } from 'kibana/server';
import { JsonObject } from '../../../../src/plugins/data/common/es_query/kuery';
import { EndpointConfigType } from './config';

/**
 * The context for Endpoint apps.
 */
export interface EndpointAppContext {
  logFactory: LoggerFactory;
  config(): Promise<EndpointConfigType>;
}

/**
 * Custom validation error class for the Endpoint app.
 */
export class EndpointValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EndpointValidationError';
  }
}

/**
 * Request params for alert queries.
 *
 * Must match exactly the values that the API receives.
 */
export interface AlertRequestParams {
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
export interface AlertRequestData {
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
export interface AlertSortParam {
  [key: string]: {
    order: 'asc' | 'desc';
  };
}

/**
 * Request body for alerts.
 */
export interface AlertRequestBody {
  track_total_hits: number;
  query: JsonObject;
  sort: [AlertSortParam, AlertSortParam];
  search_after?: any;
}

/**
 * Request for alerts.
 */
export interface AlertRequest {
  index: string;
  size: number;
  from?: number;
  body: AlertRequestBody;
}
