/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { getTraceItems } from './get_trace_items';

export async function getTrace(traceId: string, setup: Setup & SetupTimeRange) {
  const { errorsPerTransaction, ...trace } = await getTraceItems(
    traceId,
    setup
  );

  return {
    trace,
    errorsPerTransaction,
  };
}
