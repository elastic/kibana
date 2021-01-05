/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AsyncSearchStatusResponse } from '../types';

export enum SearchStatus {
  IN_PROGRESS = 'in_progress',
  ERROR = 'error',
  COMPLETE = 'complete',
}

export function isAsyncSearchStatusResponse(response: any): response is AsyncSearchStatusResponse {
  return response.is_partial !== undefined && response.is_running !== undefined;
}
