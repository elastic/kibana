/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ShardsResponse } from 'elasticsearch';

export enum SearchStatus {
  IN_PROGRESS = 'in_progress',
  ERROR = 'error',
  COMPLETE = 'complete',
}

export interface AsyncSearchStatusResponse<T = unknown> {
  id?: string;
  is_partial: boolean;
  is_running: boolean;
  start_time_in_millis: number;
  expiration_time_in_millis: number;
  completion_status: number;
  _shards: ShardsResponse;
}

export function isAsyncSearchStatusResponse(response: any): response is AsyncSearchStatusResponse {
  return response.is_partial !== undefined && response.is_running !== undefined;
}
