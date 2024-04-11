/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import {
  useHostKpiCharts,
  useHostCharts,
  useKubernetesCharts,
  type HostMetricTypes,
} from './use_metrics_charts';

const dataViewId = 'metricsDataViewId';

describe('useHostCharts', () => {
  describe('host charts', () => {
    describe.each<[HostMetricTypes]>([['cpu'], ['memory'], ['network'], ['disk'], ['log']])(
      '%s',
      (item) => {
        const getExpectedOrder = (metric: HostMetricTypes, overview: boolean): string[] => {
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

        test.each<[HostMetricTypes]>([[item]])(
          'should return an array of charts with correct order for metric "%s"',
          async (metric) => {
            const expectedOrder = getExpectedOrder(metric, false);

            const { result, waitForNextUpdate } = renderHook(() =>
              useHostCharts({ dataViewId, metric })
            );
            await waitForNextUpdate();

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
            const expectedOrder = getExpectedOrder(metric, true);

            const { result, waitForNextUpdate } = renderHook(() =>
              useHostCharts({ dataViewId, metric, options: { overview: true } })
            );
            await waitForNextUpdate();

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

  describe('kubernetes charts', () => {
    it('should return an array of charts with correct order - overview', async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        useKubernetesCharts({ dataViewId, options: { overview: true } })
      );
      await waitForNextUpdate();

      const expectedOrder = ['nodeCpuCapacity', 'nodeMemoryCapacity'];

      const { charts } = result.current;

      expect(charts).toHaveLength(expectedOrder.length);

      charts.forEach((chart, index) => {
        expect(chart).toHaveProperty('id', expectedOrder[index]);
      });
    });

    it('should return an array of charts with correct order', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useKubernetesCharts({ dataViewId }));
      await waitForNextUpdate();

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
    it('should return an array of charts with correct order and options', async () => {
      const expectedOrder = ['cpuUsage', 'normalizedLoad1m', 'memoryUsage', 'diskUsage'];

      const options = {
        seriesColor: 'blue',
        subtitle: 'Custom Subtitle',
      };

      const { result, waitForNextUpdate } = renderHook(() =>
        useHostKpiCharts({ dataViewId, options })
      );
      await waitForNextUpdate();

      expect(result.current).toHaveLength(expectedOrder.length);

      result.current.forEach((chart, index) => {
        expect(chart).toHaveProperty('id', expectedOrder[index]);
        expect(chart).toHaveProperty('subtitle', options.subtitle);
        expect(chart).toHaveProperty('decimals', 1);
        expect(chart).toHaveProperty('seriesColor', options.seriesColor);
      });
    });
  });
});
