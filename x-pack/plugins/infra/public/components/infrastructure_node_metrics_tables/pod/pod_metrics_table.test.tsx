/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpFetchOptions } from '@kbn/core/public';
import { CoreProviders } from '../../../apps/common_providers';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { MetricsExplorerSeries } from '../../../../common/http_api';
import type {
  DataResponseMock,
  NodeMetricsTableFetchMock,
  SourceResponseMock,
} from '../test_helpers';
import { createStartServicesAccessorMock } from '../test_helpers';
import { createLazyPodMetricsTable } from './create_lazy_pod_metrics_table';
import IntegratedPodMetricsTable from './integrated_pod_metrics_table';
import { PodMetricsTable } from './pod_metrics_table';
import { metricByField } from './use_pod_metrics_table';

describe('PodMetricsTable', () => {
  const timerange = {
    from: 'now-15m',
    to: 'now',
  };

  const filterClauseDsl = {
    bool: {
      should: [
        {
          match: {
            'pod.name': 'gke-edge-oblt-pool-1-9a60016d-lgg9',
          },
        },
      ],
      minimum_should_match: 1,
    },
  };

  const fetchMock = createFetchMock();

  const loadingIndicatorTestId = 'metricsTableLoadingContent';

  describe('createLazyPodMetricsTable', () => {
    it('should lazily load and render the table', async () => {
      const { fetch, getStartServices } = createStartServicesAccessorMock(fetchMock);
      const LazyPodMetricsTable = createLazyPodMetricsTable(getStartServices);

      render(<LazyPodMetricsTable timerange={timerange} filterClauseDsl={filterClauseDsl} />);

      expect(screen.queryByTestId(loadingIndicatorTestId)).not.toBeInTheDocument();
      expect(screen.queryByTestId('podMetricsTable')).not.toBeInTheDocument();

      // Using longer time out since resolving dynamic import can be slow
      // https://github.com/facebook/jest/issues/10933
      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2), {
        timeout: 10000,
      });

      expect(screen.queryByTestId(loadingIndicatorTestId)).not.toBeInTheDocument();
      expect(screen.queryByTestId('podMetricsTable')).toBeInTheDocument();
    }, 10000);
  });

  describe('IntegratedPodMetricsTable', () => {
    it('should render a single row of data', async () => {
      const { coreProvidersPropsMock, fetch } = createStartServicesAccessorMock(fetchMock);

      const { findByText } = render(
        <IntegratedPodMetricsTable
          timerange={timerange}
          filterClauseDsl={filterClauseDsl}
          sourceId="default"
          {...coreProvidersPropsMock}
        />
      );

      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

      expect(await findByText(/some-pod/)).toBeInTheDocument();
    });
  });

  it('should render a loading indicator on first load', () => {
    const { coreProvidersPropsMock } = createStartServicesAccessorMock(jest.fn());

    const { queryByTestId } = render(
      <CoreProviders {...coreProvidersPropsMock}>
        <PodMetricsTable
          data={{ state: 'unknown' }}
          isLoading={true}
          setCurrentPageIndex={jest.fn()}
          setSortState={jest.fn()}
          sortState={{ field: 'id', direction: 'asc' }}
          timerange={{ from: new Date().toISOString(), to: new Date().toISOString() }}
        />
      </CoreProviders>
    );

    expect(queryByTestId(loadingIndicatorTestId)).toBeInTheDocument();
  });

  it('should render a prompt when indices are missing', () => {
    const { coreProvidersPropsMock } = createStartServicesAccessorMock(jest.fn());

    const { queryByTestId } = render(
      <CoreProviders {...coreProvidersPropsMock}>
        <PodMetricsTable
          data={{ state: 'no-indices' }}
          isLoading={false}
          setCurrentPageIndex={jest.fn()}
          setSortState={jest.fn()}
          sortState={{ field: 'id', direction: 'asc' }}
          timerange={{ from: new Date().toISOString(), to: new Date().toISOString() }}
        />
      </CoreProviders>
    );

    expect(queryByTestId('metricsTableLoadingContent')).toBeInTheDocument();
  });
});

function createFetchMock(): NodeMetricsTableFetchMock {
  const sourceMock: SourceResponseMock = {
    source: {
      configuration: {
        metricAlias: 'some-index-pattern',
      },
      status: {
        metricIndicesExist: true,
      },
    },
  };

  const mockData: DataResponseMock = {
    series: [
      createPod('358d96e3-026f-4440-a487-f6c2301884c0', 'some-pod', 76, 3671700000),
      createPod('358d96e3-026f-4440-a487-f6c2301884c1', 'some-other-pod', 67, 716300000),
    ],
  };

  return (path: string, _options: HttpFetchOptions) => {
    // options can be used to read body for filter clause
    if (path === '/api/metrics/source/default') {
      return Promise.resolve(sourceMock);
    } else if (path === '/api/infra/metrics_explorer') {
      return Promise.resolve(mockData);
    }

    throw new Error('Unexpected URL called in test');
  };
}

function createPod(
  id: string,
  name: string,
  cpuUsagePct: number,
  memoryUsageBytes: number
): Partial<MetricsExplorerSeries> {
  return {
    id: `${id} / ${name}`,
    keys: [id, name],
    rows: [
      {
        [metricByField['kubernetes.pod.cpu.usage.limit.pct']]: cpuUsagePct,
        [metricByField['kubernetes.pod.memory.usage.bytes']]: memoryUsageBytes,
      } as MetricsExplorerSeries['rows'][number],
    ],
  };
}
