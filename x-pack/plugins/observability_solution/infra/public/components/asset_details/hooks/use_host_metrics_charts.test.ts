/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { HostMetricTypes } from '../charts/types';
import { useHostKpiCharts, useHostCharts, useKubernetesCharts } from './use_host_metrics_charts';

const dataViewId = 'metricsDataViewId';
const getHostChartsExpectedOrder = (metric: HostMetricTypes, overview: boolean): string[] => {
  switch (metric) {
    case 'cpu':
      return overview
        ? ['cpuUsage', 'normalizedLoad1m']
        : ['cpuUsage', 'cpuUsageBreakdown', 'normalizedLoad1m', 'loadBreakdown'];
    case 'memory':
      return overview ? ['memoryUsage'] : ['memoryUsage', 'memoryUsageBreakdown'];
    case 'network':
      return ['rxTx'];
    case 'disk':
      return overview
        ? ['diskUsageByMountPoint', 'diskIOReadWrite']
        : ['diskUsageByMountPoint', 'diskIOReadWrite', 'diskThroughputReadWrite'];
    case 'log':
      return ['logRate'];
    default:
      return [];
  }
};

describe('useHostCharts', () => {
  describe.each<[HostMetricTypes]>([['cpu'], ['memory'], ['network'], ['disk'], ['log']])(
    '%s',
    (item) => {
      test.each<[HostMetricTypes]>([[item]])(
        'should return an array of charts with correct order for metric "%s"',
        async (metric) => {
          const expectedOrder = getHostChartsExpectedOrder(metric, false);

          const { result } = renderHook(() => useHostCharts({ dataViewId, metric }));
          await waitFor(() => null);

          const { charts } = result.current;

          expect(charts).toHaveLength(expectedOrder.length);

          charts.forEach((chart, index) => {
            expect(chart).toHaveProperty('id', expectedOrder[index]);
          });
        }
      );

      test.each<[HostMetricTypes]>([[item]])(
        'should return an array of charts with correct order for metric "%s" - overview',
        async (metric) => {
          const expectedOrder = getHostChartsExpectedOrder(metric, true);

          const { result } = renderHook(() =>
            useHostCharts({ dataViewId, metric, overview: true })
          );
          await waitFor(() => null);

          const { charts } = result.current;

          expect(charts).toHaveLength(expectedOrder.length);

          charts.forEach((chart, index) => {
            expect(chart).toHaveProperty('id', expectedOrder[index]);
          });
        }
      );
    }
  );
});

describe('useKubernetesCharts', () => {
  it('should return an array of charts with correct order - overview', async () => {
    const { result } = renderHook(() => useKubernetesCharts({ dataViewId, overview: true }));
    await waitFor(() => null);

    const expectedOrder = ['nodeCpuCapacity', 'nodeMemoryCapacity'];

    const { charts } = result.current;

    expect(charts).toHaveLength(expectedOrder.length);

    charts.forEach((chart, index) => {
      expect(chart).toHaveProperty('id', expectedOrder[index]);
    });
  });

  it('should return an array of charts with correct order', async () => {
    const { result } = renderHook(() => useKubernetesCharts({ dataViewId }));
    await waitFor(() => null);

    const expectedOrder = [
      'nodeCpuCapacity',
      'nodeMemoryCapacity',
      'nodeDiskCapacity',
      'nodePodCapacity',
    ];

    const { charts } = result.current;

    expect(charts).toHaveLength(expectedOrder.length);

    charts.forEach((chart, index) => {
      expect(chart).toHaveProperty('id', expectedOrder[index]);
    });
  });
});

describe('useHostKpiCharts', () => {
  it('should return an array of charts with correct order', async () => {
    const { result } = renderHook(() => useHostKpiCharts({ dataViewId }));
    await waitFor(() => null);

    const expectedOrder = ['cpuUsage', 'normalizedLoad1m', 'memoryUsage', 'diskUsage'];

    expect(result.current).toHaveLength(expectedOrder.length);

    result.current.forEach((chart, index) => {
      expect(chart).toHaveProperty('id', expectedOrder[index]);
      // diskUsage should have subtitle 'Max'
      expect(chart).toHaveProperty('subtitle', index === 3 ? 'Max' : 'Average');
      expect(chart).toHaveProperty('decimals', 1);
    });
  });

  it('should return an array of charts with correct options', async () => {
    const options = {
      seriesColor: 'blue',
      getSubtitle: () => 'Custom Subtitle',
    };

    const { result } = renderHook(() => useHostKpiCharts({ dataViewId, ...options }));
    await waitFor(() => null);

    expect(result.current).toHaveLength(4);

    result.current.forEach((chart) => {
      expect(chart).toHaveProperty('seriesColor', options.seriesColor);
      expect(chart).toHaveProperty('subtitle', 'Custom Subtitle');
    });
  });
});
