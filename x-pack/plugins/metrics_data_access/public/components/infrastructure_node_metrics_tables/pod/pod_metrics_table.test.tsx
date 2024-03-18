/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreProviders } from '../../../apps/common_providers';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { MetricsExplorerSeries } from '../../../../common/http_api';
import { createStartServicesAccessorMock, createMetricsClientMock } from '../test_helpers';
import { createLazyPodMetricsTable } from './create_lazy_pod_metrics_table';
import IntegratedPodMetricsTable from './integrated_pod_metrics_table';
import { PodMetricsTable } from './pod_metrics_table';
import { metricByField } from './use_pod_metrics_table';

jest.mock('../../../pages/link_to/use_node_details_redirect', () => ({
  useNodeDetailsRedirect: jest.fn(() => ({
    getNodeDetailUrl: jest.fn(() => ({
      app: 'metrics',
      pathname: 'link-to/pod-detail/example-01',
      search: { from: '1546340400000', to: '1546344000000' },
    })),
  })),
}));

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

  const mockData = {
    series: [
      createPod('358d96e3-026f-4440-a487-f6c2301884c0', 'some-pod', 76, 3671700000),
      createPod('358d96e3-026f-4440-a487-f6c2301884c1', 'some-other-pod', 67, 716300000),
    ],
  };
  const getMetricsClient = () => createMetricsClientMock(mockData);

  const loadingIndicatorTestId = 'metricsTableLoadingContent';

  describe('createLazyPodMetricsTable', () => {
    it('should lazily load and render the table', async () => {
      const { getStartServices } = createStartServicesAccessorMock();
      const metricsClient = getMetricsClient();
      const LazyPodMetricsTable = createLazyPodMetricsTable(getStartServices()[0], metricsClient);

      render(<LazyPodMetricsTable timerange={timerange} filterClauseDsl={filterClauseDsl} />);

      expect(screen.queryByTestId(loadingIndicatorTestId)).not.toBeInTheDocument();
      expect(screen.queryByTestId('podMetricsTable')).not.toBeInTheDocument();

      // Using longer time out since resolving dynamic import can be slow
      // https://github.com/facebook/jest/issues/10933
      await waitFor(
        () => {
          expect(metricsClient.metricsIndices).toHaveBeenCalledTimes(1);
          expect(metricsClient.metricsExplorer).toHaveBeenCalledTimes(1);
        },
        {
          timeout: 10000,
        }
      );

      expect(screen.queryByTestId(loadingIndicatorTestId)).not.toBeInTheDocument();
      expect(screen.queryByTestId('podMetricsTable')).toBeInTheDocument();
    }, 10000);
  });

  describe('IntegratedPodMetricsTable', () => {
    it('should render a single row of data', async () => {
      const { coreProvidersPropsMock } = createStartServicesAccessorMock();
      const metricsClient = getMetricsClient();

      const { findByText } = render(
        <IntegratedPodMetricsTable
          timerange={timerange}
          filterClauseDsl={filterClauseDsl}
          sourceId="default"
          metricsClient={metricsClient}
          {...coreProvidersPropsMock}
        />
      );

      await waitFor(() => {
        expect(metricsClient.metricsIndices).toHaveBeenCalledTimes(1);
        expect(metricsClient.metricsExplorer).toHaveBeenCalledTimes(1);
      });

      expect(await findByText(/some-pod/)).toBeInTheDocument();
    });
  });

  it('should render a loading indicator on first load', () => {
    const { coreProvidersPropsMock } = createStartServicesAccessorMock();

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
    const { coreProvidersPropsMock } = createStartServicesAccessorMock();

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
