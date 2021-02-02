/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse, ShardsResponse } from 'elasticsearch';

export interface AsyncSearchResponse<T = unknown> {
  id?: string;
  response: SearchResponse<T>;
  start_time_in_millis: number;
  expiration_time_in_millis: number;
  is_partial: boolean;
  is_running: boolean;
}
export interface AsyncSearchStatusResponse extends Omit<AsyncSearchResponse, 'response'> {
  completion_status: number;
  _shards: ShardsResponse;
}

export interface EqlSearchResponse<T = unknown> extends SearchResponse<T> {
  id?: string;
  is_partial: boolean;
  is_running: boolean;
}
