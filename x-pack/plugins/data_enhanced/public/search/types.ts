/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISearchOptions, ISyncSearchRequest } from '../../../../../src/plugins/data/public';

export interface IAsyncSearchRequest extends ISyncSearchRequest {
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
