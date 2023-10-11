/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useHostMetricsTable } from './use_host_metrics_table';
import { useInfrastructureNodeMetrics } from '../shared';
import { renderHook } from '@testing-library/react-hooks';

jest.mock('../shared', () => ({
  ...jest.requireActual('../shared'),
  useInfrastructureNodeMetrics: jest.fn(),
}));

describe('useHostMetricsTable hook', () => {
  const useInfrastructureNodeMetricsMock = useInfrastructureNodeMetrics as jest.MockedFunction<
    typeof useInfrastructureNodeMetrics
  >;

  it('should call useInfrastructureNodeMetrics hook with event.module filter in filterClauseDsl query', () => {
    const filterClauseDsl = {
      bool: {
        should: [
          {
            terms: {
              'host.name': 'gke-edge-oblt-pool-1-9a60016d-lgg9',
            },
          },
        ],
        minimum_should_match: 1,
      },
    };

    const filterClauseWithEventModuleFilter = {
      bool: {
        filter: [{ term: { 'event.module': 'system' } }, { ...filterClauseDsl }],
      },
    };

    renderHook(() =>
      useHostMetricsTable({
        timerange: { from: 'now-30d', to: 'now' },
        filterClauseDsl,
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
