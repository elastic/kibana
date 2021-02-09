/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EqlSearch } from '@elastic/elasticsearch/api/requestParams';
import { ApiResponse, TransportRequestOptions } from '@elastic/elasticsearch/lib/Transport';

import {
  ISearchOptions,
  IKibanaSearchRequest,
  IKibanaSearchResponse,
} from '../../../../../src/plugins/data/common';

export const ENHANCED_ES_SEARCH_STRATEGY = 'ese';

export const EQL_SEARCH_STRATEGY = 'eql';

export type EqlRequestParams = EqlSearch<Record<string, unknown>>;

export interface EqlSearchStrategyRequest extends IKibanaSearchRequest<EqlRequestParams> {
  options?: TransportRequestOptions;
}

export type EqlSearchStrategyResponse<T = unknown> = IKibanaSearchResponse<ApiResponse<T>>;

export interface IAsyncSearchOptions extends ISearchOptions {
  /**
   * The number of milliseconds to wait between receiving a response and sending another request
   */
  pollInterval?: number;
}
