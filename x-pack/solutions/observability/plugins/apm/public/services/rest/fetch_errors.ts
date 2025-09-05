/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APIReturnType } from './create_call_apm_api';
import { callApmApi } from './create_call_apm_api';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import type { Environment } from '../../../common/environment_rt';

type MainStatistics = APIReturnType<'GET /internal/apm/services/errors/groups/main_statistics'>;

export const fetchErrors = (
  {
    serviceName,
    traceId,
    transactionId,
    spanId,
    start,
    end,
    environment,
  }: {
    serviceName?: string;
    traceId?: string;
    transactionId?: string;
    spanId?: string;
    start: string;
    end: string;
    environment?: Environment;
    kuery?: string;
  },
  signal: AbortSignal
): Promise<MainStatistics> =>
  callApmApi('GET /internal/apm/services/errors/groups/main_statistics', {
    params: {
      query: {
        serviceName,
        kuery: '',
        start,
        end,
        traceId,
        transactionId,
        spanId,
        environment: environment ?? ENVIRONMENT_ALL.value,
      },
    },
    signal,
  });
