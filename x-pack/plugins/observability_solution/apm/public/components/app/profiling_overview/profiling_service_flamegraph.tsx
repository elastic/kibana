/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { useFetcher } from '../../../hooks/use_fetcher';
import { ProfilingFlamegraphChart } from '../../shared/profiling/flamegraph';
import { ProfilingFlamegraphLink } from '../../shared/profiling/flamegraph/flamegraph_link';

interface Props {
  serviceName: string;
  start: string;
  end: string;
  kuery: string;
  rangeFrom: string;
  rangeTo: string;
}

export function ProfilingServiceFlamegraph({
  start,
  end,
  serviceName,
  kuery,
  rangeFrom,
  rangeTo,
}: Props) {
  const { data, status } = useFetcher(
    (callApmApi) => {
      return callApmApi(
        'GET /internal/apm/services/{serviceName}/profiling/flamegraph',
        {
          params: {
            path: { serviceName },
            query: { start, end, kuery },
          },
        }
      );
    },
    [, serviceName, start, end, kuery]
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
      <ProfilingFlamegraphChart data={data} status={status} />
    </>
  );
}
