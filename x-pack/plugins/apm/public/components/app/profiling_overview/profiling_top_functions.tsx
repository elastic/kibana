/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmbeddableFunctions } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { isPending, useFetcher } from '../../../hooks/use_fetcher';

interface Props {
  serviceName: string;
  start: string;
  end: string;
  environment: string;
  startIndex: number;
  endIndex: number;
}

export function ProfilingTopNFunctions({
  serviceName,
  start,
  end,
  environment,
  startIndex,
  endIndex,
}: Props) {
  const { data, status } = useFetcher(
    (callApmApi) => {
      return callApmApi(
        'GET /internal/apm/services/{serviceName}/profiling/functions',
        {
          params: {
            path: { serviceName },
            query: {
              start,
              end,
              kuery: '',
              environment,
              startIndex,
              endIndex,
            },
          },
        }
      );
    },
    [serviceName, start, end, environment, startIndex, endIndex]
  );

  return (
    <EmbeddableFunctions
      data={data}
      isLoading={isPending(status)}
      rangeFrom={new Date(start).valueOf()}
      rangeTo={new Date(end).valueOf()}
    />
  );
}
