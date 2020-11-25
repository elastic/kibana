/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';

export interface AsyncSearchResponse<T = unknown> {
  id?: string;
  response: SearchResponse<T>;
  is_partial: boolean;
  is_running: boolean;
}

export interface EqlSearchResponse<T = unknown> extends SearchResponse<T> {
  id?: string;
  is_partial: boolean;
  is_running: boolean;
}
