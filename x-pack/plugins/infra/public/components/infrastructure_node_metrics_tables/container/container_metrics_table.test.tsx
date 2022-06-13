/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { HttpFetchOptions } from '@kbn/core/public';
import type {
  DataResponseMock,
  NodeMetricsTableFetchMock,
  SourceResponseMock,
} from '../test_helpers';
import { createStartServicesAccessorMock } from '../test_helpers';
import { createLazyContainerMetricsTable } from './create_lazy_container_metrics_table';
import IntegratedContainerMetricsTable from './integrated_container_metrics_table';
import { metricByField } from './use_container_metrics_table';

describe('ContainerMetricsTable', () => {
  const timerange = {
    from: 'now-15m',
    to: 'now',
  };

  const filterClauseDsl = {
    bool: {
      should: [
        {
          match: {
            'host.name': 'gke-edge-oblt-pool-1-9a60016d-lgg9',
          },
        },
      ],
      minimum_should_match: 1,
    },
  };

  const fetchMock = createFetchMock();

  describe('createLazyContainerMetricsTable', () => {
    it('should lazily load and render the table', async () => {
      const { fetch, getStartServices } = createStartServicesAccessorMock(fetchMock);
      const LazyContainerMetricsTable = createLazyContainerMetricsTable(getStartServices);

      render(<LazyContainerMetricsTable timerange={timerange} filterClauseDsl={filterClauseDsl} />);

      expect(screen.queryByTestId('containerMetricsTableLoader')).not.toBeInTheDocument();
      expect(screen.queryByTestId('containerMetricsTable')).not.toBeInTheDocument();

      // Using longer time out since resolving dynamic import can be slow
      // https://github.com/facebook/jest/issues/10933
      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2), {
        timeout: 10000,
      });

      expect(screen.queryByTestId('containerMetricsTableLoader')).not.toBeInTheDocument();
      expect(screen.queryByTestId('containerMetricsTable')).toBeInTheDocument();
    }, 10000);
  });

  describe('IntegratedContainerMetricsTable', () => {
    it('should render a single row of data', async () => {
      const { coreProvidersPropsMock, fetch } = createStartServicesAccessorMock(fetchMock);

      const { findByText } = render(
        <IntegratedContainerMetricsTable
          timerange={timerange}
          filterClauseDsl={filterClauseDsl}
          sourceId="default"
          {...coreProvidersPropsMock}
        />
      );

      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

      expect(await findByText(/some-container/)).toBeInTheDocument();
    });
  });
});

function createFetchMock(): NodeMetricsTableFetchMock {
  const sourceMock: SourceResponseMock = {
    source: {
      configuration: {
        metricAlias: 'some-index-pattern',
      },
    },
  };

  const mockData: DataResponseMock = {
    series: [
      createContainer('some-container', 23000000, 76, 3671700000),
      createContainer('some-other-container', 32000000, 67, 716300000),
    ],
  };

  return (path: string, options: HttpFetchOptions) => {
    // options can be used to read body for filter clause
    if (path === '/api/metrics/source/default') {
      return Promise.resolve(sourceMock);
    } else if (path === '/api/infra/metrics_explorer') {
      return Promise.resolve(mockData);
    }

    throw new Error('Unexpected URL called in test');
  };
}

function createContainer(
  name: string,
  uptimeMs: number,
  cpuUsagePct: number,
  memoryUsageBytes: number
) {
  return {
    id: name,
    rows: [
      {
        [metricByField['kubernetes.container.start_time']]: uptimeMs,
        [metricByField['kubernetes.container.cpu.usage.node.pct']]: cpuUsagePct,
        [metricByField['kubernetes.container.memory.usage.bytes']]: memoryUsageBytes,
      },
    ],
  };
}
