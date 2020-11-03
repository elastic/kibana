/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTotalLoaded } from '../../../../../src/plugins/data/server';
import { AsyncSearchResponse } from './types';

/**
 * Get the Kibana representation of this response (see `IKibanaSearchResponse`).
 */
export function toKibanaSearchResponse(response: AsyncSearchResponse) {
  return {
    id: response.id,
    rawResponse: response.response,
    isPartial: response.is_partial,
    isRunning: response.is_running,
    ...getTotalLoaded(response.response),
  };
}
