/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../helpers/setup_request';
import {
  ErrorsPerTransaction,
  getTraceErrorsPerTransaction
} from './get_trace_errors_per_transaction';
import { getTraceItems, TraceItem } from './get_trace_items';

export interface TraceAPIResponse {
  trace: TraceItem[];
  errorsPerTransaction: ErrorsPerTransaction;
}

export async function getTrace(
  traceId: string,
  setup: Setup
): Promise<TraceAPIResponse> {
  return Promise.all([
    getTraceItems(traceId, setup),
    getTraceErrorsPerTransaction(traceId, setup)
  ]).then(([trace, errorsPerTransaction]) => ({
    trace,
    errorsPerTransaction
  }));
}
