/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { callApmApi } from './create_call_apm_api';

export const fetchSpan = (
  {
    traceId,
    spanId,
  }: {
    traceId: string;
    spanId: string;
  },
  signal: AbortSignal
) =>
  callApmApi('GET /internal/apm/unified_traces/{traceId}/spans/{spanId}', {
    params: { path: { traceId, spanId } },
    signal,
  });
