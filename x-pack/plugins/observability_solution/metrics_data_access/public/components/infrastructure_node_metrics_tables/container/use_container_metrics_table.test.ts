/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContainerMetricsTable } from './use_container_metrics_table';
import { useInfrastructureNodeMetrics } from '../shared';
import { renderHook } from '@testing-library/react';
import { createMetricsClientMock } from '../test_helpers';

jest.mock('../shared', () => ({
  ...jest.requireActual('../shared'),
  useInfrastructureNodeMetrics: jest.fn(),
}));

describe('useContainerMetricsTable hook', () => {
  const useInfrastructureNodeMetricsMock = useInfrastructureNodeMetrics as jest.MockedFunction<
    typeof useInfrastructureNodeMetrics
  >;

  it('should call useInfrastructureNodeMetrics hook with event.module filter in filterClauseDsl query', () => {
    const filterClauseDsl = {
      bool: {
        filter: [{ terms: { 'container.id': 'gke-edge-oblt-pool-1-9a60016d-lgg9' } }],
      },
    };

    const filterClauseWithEventModuleFilter = {
      bool: {
        filter: [{ term: { 'event.dataset': 'kubernetes.container' } }, { ...filterClauseDsl }],
      },
    };

    renderHook(() =>
      useContainerMetricsTable({
        timerange: { from: 'now-30d', to: 'now' },
        filterClauseDsl,
        metricsClient: createMetricsClientMock({}),
      })
    );

    expect(useInfrastructureNodeMetricsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metricsExplorerOptions: expect.objectContaining({
          filterQuery: JSON.stringify(filterClauseWithEventModuleFilter),
        }),
      })
    );
  });
});
