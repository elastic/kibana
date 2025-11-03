/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APIReturnType } from './create_call_apm_api';
import { callApmApi } from './create_call_apm_api';

type TraceRootItem = APIReturnType<'GET /internal/apm/traces/{traceId}/root_item'>;

export const fetchRootItemByTraceId = (
  {
    traceId,
    start,
    end,
  }: {
    traceId: string;
    start: string;
    end: string;
  },
  signal: AbortSignal
): Promise<TraceRootItem | undefined> =>
  callApmApi('GET /internal/apm/traces/{traceId}/root_item', {
    params: {
      path: { traceId },
      query: {
        start,
        end,
      },
    },
    signal,
  });
