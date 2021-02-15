/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
} from '../../../../../../src/plugins/data/public';
import { SearchStrategyError } from '../../../common/search_strategies/common/errors';

export interface DataSearchRequestDescriptor<Request extends IKibanaSearchRequest, RawResponse> {
  request: Request;
  options: ISearchOptions;
  response$: Observable<IKibanaSearchResponse<RawResponse>>;
  abortController: AbortController;
}

export interface NormalizedKibanaSearchResponse<ResponseData> {
  total?: number;
  loaded?: number;
  isRunning: boolean;
  isPartial: boolean;
  data: ResponseData;
  errors: SearchStrategyError[];
}

export interface DataSearchResponseDescriptor<Request extends IKibanaSearchRequest, Response> {
  request: Request;
  options: ISearchOptions;
  response: NormalizedKibanaSearchResponse<Response>;
  abortController: AbortController;
}
