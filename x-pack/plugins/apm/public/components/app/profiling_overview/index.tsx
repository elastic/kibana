/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EmbeddableFlamegraph,
  EmbeddableFunctions,
} from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { EuiHorizontalRule } from '@elastic/eui';
import { useApmParams } from '../../../hooks/use_apm_params';
import { isPending, useFetcher } from '../../../hooks/use_fetcher';
import { useProfilingPlugin } from '../../../hooks/use_profiling_plugin';
import { useTimeRange } from '../../../hooks/use_time_range';

export function ProfilingOverview() {
  const {
    path: { serviceName },
    query: { kuery, rangeFrom, rangeTo, environment },
  } = useApmParams('/services/{serviceName}/profiling');
  const { isProfilingAvailable } = useProfilingPlugin();

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const { data, status } = useFetcher(
    (callApmApi) => {
      if (isProfilingAvailable) {
        return callApmApi(
          'GET /internal/apm/services/{serviceName}/profiling',
          {
            params: {
              path: { serviceName },
              query: {
                start,
                end,
                kuery,
                environment,
                startIndex: 0,
                endIndex: 10,
              },
            },
          }
        );
      }
    },
    [isProfilingAvailable, serviceName, start, end, kuery, environment]
  );

  if (!isProfilingAvailable) {
    return null;
  }

  const isLoading = isPending(status);

  return (
    <>
      <EmbeddableFlamegraph
        data={data?.flamegraph}
        isLoading={isLoading}
        height="60vh"
      />
      <EuiHorizontalRule />
      <EmbeddableFunctions data={data?.functions} isLoading={isLoading} />
    </>
  );
}
