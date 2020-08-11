/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IEsSearchRequest,
  IEsSearchResponse,
  ISearchRequestParams,
} from '../../../../../src/plugins/data/common';

export interface EnhancedSearchParams extends ISearchRequestParams {
  ignoreThrottled: boolean;
}

export interface IAsyncSearchRequest extends IEsSearchRequest {
  /**
   * The ID received from the response from the initial request
   */
  id?: string;

  params?: EnhancedSearchParams;
}

export interface IAsyncSearchResponse extends IEsSearchResponse {
  /**
   * Indicates whether async search is still in flight
   */
  is_running?: boolean;
  /**
   * Indicates whether the results returned are complete or partial
   */
  is_partial?: boolean;
}

export interface IEnhancedEsSearchRequest extends IEsSearchRequest {
  /**
   * Used to determine whether to use the _rollups_search or a regular search endpoint.
   */
  isRollup?: boolean;
}
