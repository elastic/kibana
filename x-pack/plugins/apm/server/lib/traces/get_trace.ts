/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PromiseReturnType } from '../../../typings/common';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { getTraceItems } from './get_trace_items';

export type TraceAPIResponse = PromiseReturnType<typeof getTrace>;
export async function getTrace(traceId: string, setup: Setup & SetupTimeRange) {
  const { errorsPerTransaction, ...trace } = await getTraceItems(
    traceId,
    setup
  );

  return {
    trace,
    errorsPerTransaction
  };
}
