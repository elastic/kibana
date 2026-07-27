/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Environment } from '../../../../../common/environment_rt';
import { isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';

interface Params {
  serviceName: string;
  environment: Environment;
  rangeFrom: string;
  rangeTo: string;
}

export function useServiceHasSystemMetrics({
  serviceName,
  environment,
  rangeFrom,
  rangeTo,
}: Params): { hasSystemMetrics: boolean | undefined; isLoading: boolean } {
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data, status } = useFetcher(
    (callApmApi) =>
      callApmApi('GET /internal/apm/services/{serviceName}/has_system_metrics', {
        params: {
          path: { serviceName },
          query: { environment, start, end },
        },
      }),
    [serviceName, environment, start, end],
    { showToastOnError: false, useLegacyCallApmApi: true }
  );

  return { hasSystemMetrics: data?.hasSystemMetrics, isLoading: isPending(status) };
}
