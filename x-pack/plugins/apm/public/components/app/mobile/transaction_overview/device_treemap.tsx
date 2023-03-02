/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useFetcher, FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { TreemapChart } from '../../../shared/charts/treemap_chart';

export function DeviceTreemap({
  kuery,
  serviceName,
  start,
  end,
  environment,
}: {
  kuery: string;
  serviceName: string;
  start: string;
  end: string;
  environment: string;
  offset?: string;
  comparisonEnabled: boolean;
}) {
  const { data, status } = useFetcher(
    (callApmApi) => {
      return callApmApi(
        'GET /internal/apm/mobile-services/{serviceName}/devices',
        {
          params: {
            path: {
              serviceName,
            },
            query: {
              environment,
              kuery,
              start,
              end,
              size: 50,
            },
          },
        }
      );
    },
    [environment, kuery, serviceName, start, end]
  );

  return (
    <TreemapChart
      fetchStatus={status}
      data={data?.devices}
      id="device-treemap"
      height={256}
    />
  );
}
