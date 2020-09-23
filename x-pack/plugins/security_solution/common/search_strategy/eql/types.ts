/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EqlSearch } from '@elastic/elasticsearch/api/requestParams';
import { ApiResponse, TransportRequestOptions } from '@elastic/elasticsearch/lib/Transport';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
} from '../../../../../../src/plugins/data/common';

export type EqlRequestParams = EqlSearch<Record<string, unknown>>;

export interface EqlSearchStrategyRequest extends IKibanaSearchRequest<EqlRequestParams> {
  options?: TransportRequestOptions;
}

export type EqlSearchStrategyResponse<T = unknown> = IKibanaSearchResponse<ApiResponse<T>>;
