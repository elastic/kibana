/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmbeddableFlamegraph } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { isPending, useFetcher } from '../../../hooks/use_fetcher';

interface Props {
  serviceName: string;
  start: string;
  end: string;
  environment: string;
}

export function ProfilingFlamegraph({
  start,
  end,
  serviceName,
  environment,
}: Props) {
  const { data, status } = useFetcher(
    (callApmApi) => {
      return callApmApi(
        'GET /internal/apm/services/{serviceName}/profiling/flamegraph',
        {
          params: {
            path: { serviceName },
            query: { start, end, kuery: '', environment },
          },
        }
      );
    },
    [serviceName, start, end, environment]
  );

  return (
    <EmbeddableFlamegraph
      data={data}
      isLoading={isPending(status)}
      height="60vh"
    />
  );
}
