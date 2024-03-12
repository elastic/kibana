/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { useFetcher } from '../../../../hooks/use_fetcher';
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
}

export function ProfilingFlamegraph({
  serviceName,
  rangeFrom,
  rangeTo,
  kuery,
  transactionName,
  transactionType,
  environment,
}: Props) {
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (!transactionType) {
        return;
      }
      return callApmApi(
        'GET /internal/apm/services/{serviceName}/profiling/flamegraph',
        {
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
        }
      );
    },
    [
      serviceName,
      start,
      end,
      kuery,
      transactionName,
      transactionType,
      environment,
    ]
  );

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
