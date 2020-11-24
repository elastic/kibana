/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApiResponse } from '@elastic/elasticsearch';
import { getTotalLoaded, shimHitsTotal } from '../../../../../src/plugins/data/server';
import { AsyncSearchResponse, EqlSearchResponse } from './types';
import { EqlSearchStrategyResponse } from '../../common/search';

/**
 * Get the Kibana representation of an async search response (see `IKibanaSearchResponse`).
 */
export function toAsyncKibanaSearchResponse(response: AsyncSearchResponse) {
  return {
    id: response.id,
    rawResponse: shimHitsTotal(response.response),
    isPartial: response.is_partial,
    isRunning: response.is_running,
    ...getTotalLoaded(response.response),
  };
}

/**
 * Get the Kibana representation of an EQL search response (see `IKibanaSearchResponse`).
 * (EQL does not provide _shard info, so total/loaded cannot be calculated.)
 */
export function toEqlKibanaSearchResponse(
  response: ApiResponse<EqlSearchResponse>
): EqlSearchStrategyResponse {
  return {
    id: response.body.id,
    rawResponse: shimHitsTotal(response.response),
    isPartial: response.body.is_partial,
    isRunning: response.body.is_running,
  };
}
