/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsExplorerSeries } from '../../../../common/http_api';
import { CoreProviders } from '../../../apps/common_providers';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { createStartServicesAccessorMock, createMetricsClientMock } from '../test_helpers';
import { ContainerMetricsTable } from './container_metrics_table';
import { createLazyContainerMetricsTable } from './create_lazy_container_metrics_table';
import IntegratedContainerMetricsTable from './integrated_container_metrics_table';
import { metricByField } from './use_container_metrics_table';

jest.mock('../../../pages/link_to/use_asset_details_redirect', () => ({
  useAssetDetailsRedirect: jest.fn(() => ({
    getAssetDetailUrl: jest.fn(() => ({
      app: 'metrics',
      pathname: 'link-to/container-detail/example-01',
      search: { from: '1546340400000', to: '1546344000000' },
    })),
  })),
}));

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

  const mockData = {
    series: [
      createContainer('some-container', 76, 3671700000),
      createContainer('some-other-container', 67, 716300000),
    ],
  };
  const getMetricsClient = () => createMetricsClientMock(mockData);

  const loadingIndicatorTestId = 'metricsTableLoadingContent';

  describe('createLazyContainerMetricsTable', () => {
    it('should lazily load and render the table', async () => {
      const metricsClient = getMetricsClient();
      const { getStartServices } = createStartServicesAccessorMock();
      const LazyContainerMetricsTable = createLazyContainerMetricsTable(
        getStartServices()[0],
        metricsClient
      );

      render(<LazyContainerMetricsTable timerange={timerange} filterClauseDsl={filterClauseDsl} />);

      expect(screen.queryByTestId(loadingIndicatorTestId)).not.toBeInTheDocument();
      expect(screen.queryByTestId('containerMetricsTable')).not.toBeInTheDocument();

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
      expect(screen.queryByTestId('containerMetricsTable')).toBeInTheDocument();
    }, 10000);
  });

  describe('IntegratedContainerMetricsTable', () => {
    it('should render a single row of data', async () => {
      const { coreProvidersPropsMock } = createStartServicesAccessorMock();
      const metricsClient = getMetricsClient();

      const { findByText } = render(
        <IntegratedContainerMetricsTable
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

      expect(await findByText(/some-container/)).toBeInTheDocument();
    });
  });

  it('should render a loading indicator on first load', () => {
    const { coreProvidersPropsMock } = createStartServicesAccessorMock();

    const { queryByTestId } = render(
      <CoreProviders {...coreProvidersPropsMock}>
        <ContainerMetricsTable
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
        <ContainerMetricsTable
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

function createContainer(
  name: string,
  cpuUsagePct: number,
  memoryUsageBytes: number
): Partial<MetricsExplorerSeries> {
  return {
    id: name,
    rows: [
      {
        [metricByField['kubernetes.container.cpu.usage.limit.pct']]: cpuUsagePct,
        [metricByField['kubernetes.container.memory.usage.bytes']]: memoryUsageBytes,
      } as MetricsExplorerSeries['rows'][number],
    ],
  };
}
