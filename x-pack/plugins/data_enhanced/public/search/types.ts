/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

<<<<<<< HEAD
import { ISearchOptions } from '../../../../../src/plugins/data/public';
=======
import {
  IKibanaSearchResponse,
  ISearchOptions,
  ISyncSearchRequest,
} from '../../../../../src/plugins/data/public';

export interface IAsyncSearchRequest extends ISyncSearchRequest {
  /**
   * The ID received from the response from the initial request
   */
  id?: string;
}
>>>>>>> 96e0e911ea3a63e1d174d2f1583da59e609b3088

export interface IAsyncSearchOptions extends ISearchOptions {
  /**
   * The number of milliseconds to wait between receiving a response and sending another request
   */
  pollInterval?: number;
}

export interface IAsyncSearchResponse extends IKibanaSearchResponse {
  /**
   * Indicates whether async search is still in flight
   */
  is_running?: boolean;
  /**
   * Indicates whether the results returned are complete or partial
   */
  is_partial?: boolean;
}
