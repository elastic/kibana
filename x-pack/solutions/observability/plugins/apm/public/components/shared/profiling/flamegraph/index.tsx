/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { FlamegraphChart } from '../../charts/flamegraph';
import { ProfilingFlamegraphLink } from './flamegraph_link';

interface Props {
  serviceName: string;
  rangeFrom: string;
  rangeTo: string;
  kuery: string;
  transactionName?: string;
  transactionType?: string;
  environment: string;
  /** Rendered instead of the flamegraph when the service's transactions link to no profiling samples. */
  fallback?: React.ReactNode;
}

export function ProfilingFlamegraph({
  serviceName,
  rangeFrom,
  rangeTo,
  kuery,
  transactionName,
  transactionType,
  environment,
  fallback,
}: Props) {
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (!transactionType) {
        return;
      }
      return callApmApi('GET /internal/apm/services/{serviceName}/profiling/flamegraph', {
        params: {
          path: { serviceName },
          query: {
            start,
            end,
            kuery,
            transactionName,
            transactionType,
            environment,
          },
        },
      });
    },
    [serviceName, start, end, kuery, transactionName, transactionType, environment]
  );

  if (fallback && status === FETCH_STATUS.SUCCESS && (!data || data.TotalSamples === 0)) {
    return <>{fallback}</>;
  }

  return (
    <>
      <ProfilingFlamegraphLink
        kuery={kuery}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        justifyContent="flexEnd"
      />
      <EuiSpacer />
      <FlamegraphChart data={data} status={status} />
    </>
  );
}
