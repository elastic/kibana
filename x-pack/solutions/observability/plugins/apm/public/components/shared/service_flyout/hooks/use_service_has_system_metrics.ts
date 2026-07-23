/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import type { HttpStart } from '@kbn/core/public';
import type { Environment } from '../../../../../common/environment_rt';
import { useTimeRange } from '../../../../hooks/use_time_range';

interface Params {
  http: HttpStart;
  serviceName: string;
  environment: Environment;
  rangeFrom: string;
  rangeTo: string;
}

export function useServiceHasSystemMetrics({
  http,
  serviceName,
  environment,
  rangeFrom,
  rangeTo,
}: Params): { hasSystemMetrics: boolean | undefined; isLoading: boolean } {
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { value, loading } = useAbortableAsync(
    ({ signal }) =>
      http.fetch<{ hasSystemMetrics: boolean }>(
        `/internal/apm/services/${encodeURIComponent(serviceName)}/has_system_metrics`,
        { query: { environment, start, end }, signal }
      ),
    [http, serviceName, environment, start, end]
  );

  return { hasSystemMetrics: value?.hasSystemMetrics, isLoading: loading };
}
