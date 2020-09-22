/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEsSearchRequest, ISearchOptions } from '../../../../../src/plugins/data/common';

export const ENHANCED_ES_SEARCH_STRATEGY = 'ese';

export interface IAsyncSearchRequest extends IEsSearchRequest {
  /**
   * The ID received from the response from the initial request
   */
  id?: string;
}

export interface IAsyncSearchOptions extends ISearchOptions {
  /**
   * The number of milliseconds to wait between receiving a response and sending another request
   */
  pollInterval?: number;
}

export interface IEnhancedEsSearchRequest extends IEsSearchRequest {
  /**
   * Used to determine whether to use the _rollups_search or a regular search endpoint.
   */
  isRollup?: boolean;
}
