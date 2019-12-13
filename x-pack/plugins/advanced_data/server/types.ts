/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IKibanaSearchRequest, IKibanaSearchResponse } from 'src/plugins/data/common';
import { ISearchStrategy } from '../../../../src/plugins/data/server';
import { ASYNC_DEMO_SEARCH_STRATEGY } from '../common';

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
  responseTime?: number;
}

export interface ISearchesInProgress {
  [id: string]: {
    request: IDemoDataRequest;
    response: IDemoDataResponse;
    requestStartTime: number;
    total: number;
    loaded: number;
    responseTime: number;
  };
}

export type TDemoDataSearchStrategyProvider = (
  searchesInProgress: ISearchesInProgress
) => ISearchStrategy<typeof ASYNC_DEMO_SEARCH_STRATEGY>;
