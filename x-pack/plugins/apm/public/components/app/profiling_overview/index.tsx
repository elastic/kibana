/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmbeddableFlamegraph } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { useApmParams } from '../../../hooks/use_apm_params';
import { isPending, useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';

export function ProfilingOverview() {
  const {
    path: { serviceName },
    query: { kuery, rangeFrom, rangeTo, environment },
  } = useApmParams('/services/{serviceName}/profiling');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const { data, error, status } = useFetcher(
    (callApmApi) => {
      return callApmApi(
        'GET /internal/apm/services/{serviceName}/profiling/flamegraph',
        {
          params: {
            path: { serviceName },
            query: {
              start,
              end,
              kuery,
              environment,
            },
          },
        }
      );
    },
    [serviceName, start, end, kuery, environment]
  );

  return (
    <EmbeddableFlamegraph
      data={data}
      height="60vh"
      isLoading={isPending(status)}
    />
  );
}
