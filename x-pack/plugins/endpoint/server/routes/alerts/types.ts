/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RequestHandlerContext } from 'src/core/server';
import { Filter, TimeRange } from '../../../../../../src/plugins/data/server';
import { JsonObject } from '../../../../../../src/plugins/kibana_utils/public';
import { Direction, Maybe } from '../../../common/types';
import { EndpointConfigType } from '../../config';

/**
 * Abstract Pagination class for determining next/prev urls,
 * among other things.
 */
export abstract class Pagination<T, Z> {
  constructor(
    protected config: EndpointConfigType,
    protected requestContext: RequestHandlerContext,
    protected state: T,
    protected data: Z
  ) {}
  abstract async getNextUrl(): Promise<Maybe<string>>;
  abstract async getPrevUrl(): Promise<Maybe<string>>;
}

/**
 * Sort parameters for alerts in ES.
 */
export interface AlertSortParam {
  [key: string]: {
    order: Direction;
  };
}

/**
 * Sort array for alerts.
 */
export type AlertSort = [AlertSortParam, AlertSortParam];

/**
 * Cursor-based pagination params.
 */
export type SearchCursor = [string, string];

/**
 * Request metadata used in searching alerts.
 */
export interface AlertSearchQuery {
  pageSize: number;
  pageIndex?: number;
  fromIndex?: number;
  query?: string;
  filters?: Filter[];
  dateRange?: TimeRange;
  sort: string;
  order: Direction;
  searchAfter?: SearchCursor;
  searchBefore?: SearchCursor;
}

/**
 * ES request body for alerts.
 */
export interface AlertSearchRequest {
  track_total_hits: number;
  query: JsonObject;
  sort: AlertSort;
  search_after?: SearchCursor;
}

/**
 * Request for alerts.
 */
export interface AlertSearchRequestWrapper {
  index: string;
  size: number;
  from?: number;
  body: AlertSearchRequest;
}
