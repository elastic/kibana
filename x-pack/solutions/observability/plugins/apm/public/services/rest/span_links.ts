/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProcessorEvent } from '@kbn/observability-plugin/common';
import { callApmApi } from './create_call_apm_api';
export const fetchSpanLinks = (
  {
    traceId,
    docId,
    start,
    end,
    processorEvent,
  }: {
    traceId: string;
    docId: string;
    start: string;
    end: string;
    kuery?: string;
    processorEvent?: ProcessorEvent;
  },
  signal: AbortSignal
) =>
  callApmApi('GET /internal/apm/traces/{traceId}/span_links/{spanId}', {
    params: { path: { traceId, spanId: docId }, query: { kuery: '', start, end, processorEvent } },
    signal,
  });
