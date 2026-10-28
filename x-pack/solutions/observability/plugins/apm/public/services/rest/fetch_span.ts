/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getApmInternalServices } from '../../plugin';

export const fetchSpan = (
  {
    traceId,
    spanId,
    start,
    end,
  }: {
    traceId: string;
    spanId: string;
    start: string;
    end: string;
  },
  signal: AbortSignal
) => {
  const { callApmApi } = getApmInternalServices();
  return callApmApi('GET /internal/apm/unified_traces/{traceId}/spans/{spanId}', {
    params: { path: { traceId, spanId }, query: { start, end } },
    signal,
  });
};
