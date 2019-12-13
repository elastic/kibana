/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISyncSearchRequest, ISearchOptions } from 'src/plugins/data/public';
import { IKibanaSearchRequest, IKibanaSearchResponse } from '../../../../src/plugins/data/common';

export interface ISqlSearchRequest extends IKibanaSearchRequest {
  sql: string;
}

export interface ISqlSearchResponse extends IKibanaSearchResponse {
  results: any;
}

export interface IDemoDataRequest extends IKibanaSearchRequest {
  responseTime: number;
  totalHitCount: number;
}

export interface IDemoDataHit {
  title: string;
  message: string;
}

export interface IDemoDataResponse extends IKibanaSearchResponse {
  hits: IDemoDataHit[];
}

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
