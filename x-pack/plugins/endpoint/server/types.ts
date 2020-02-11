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
 * The context for Endpoint apps.
 */
export interface EndpointAppContext {
  logFactory: LoggerFactory;
  config(): Promise<EndpointConfigType>;
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
  dateRange: TimeRange;
  query?: string;
  sort?: string;
  order?: string;
  after?: [any, any];
  before?: [any, any];
}

/**
 * Request metadata for additional context.
 *
 * Internal use: contains the validated request parameters for use
 * by the application. Keys are camel-cased and do not necessarily
 * match the names of the request parameters that were passed in.
 */
export class AlertRequestData {
  [key: string]: any;
  pageSize!: number;
  pageIndex?: number;
  fromIndex?: number;
  query?: string;
  sort!: string;
  order!: string;
  searchAfter?: [any, any];
  searchBefore?: [any, any];
  next?: string;
  prev?: string;

  // Rison-encoded
  private _filters?: esFilters.Filter[];
  private _dateRange?: TimeRange;

  public get filters(): esFilters.Filter[] {
    return this._filters;
  }

  public set filters(_filters: any) {
    if (typeof _filters === 'string') {
      try {
        this._filters = (decode(_filters) as unknown) as esFilters.Filter[];
      } catch (err) {
        // TODO: log
        this._filters = [] as esFilters.Filter[];
      }
    } else if (Array.isArray(_filters)) {
      this._filters = _filters as esFilters.Filter[];
    } else {
      // TODO: log
      this._filters = [] as esFilters.Filter[];
    }
  }

  public set dateRange(_dateRange: string) {
    try {
      this._dateRange = (decode(_dateRange) as unknown) as TimeRange;
    } catch (err) {
      // TODO: log
      this._dateRange = undefined;
    }
  }

  public get dateRange(): TimeRange {
    return this._dateRange;
  }

  public getEncoded(fieldName: string): string | null {
    try {
      return (encode(this[fieldName]) as unknown) as string;
    } catch (err) {
      // TODO: log
      return null;
    }
  }
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
  search_after?: [any, any];
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
