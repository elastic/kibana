/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { ContainerMetricTypes } from '../charts/types';
import {
  useK8sContainerPageViewMetricsCharts,
  useDockerContainerPageViewMetricsCharts,
  useDockerContainerKpiCharts,
  useK8sContainerKpiCharts,
} from './use_container_metrics_charts';

const metricsDataViewId = 'metricsDataViewId';
const getContainerChartsExpectedOrder = (metric: ContainerMetricTypes): string[] => {
  switch (metric) {
    case 'cpu':
      return ['cpuUsage'];
    case 'memory':
      return ['memoryUsage'];
    case 'network':
      return ['networkRxTx'];
    case 'disk':
      return ['diskIOReadWrite'];
    default:
      return [];
  }
};

const getK8sContainerChartsExpectedOrder = (metric: ContainerMetricTypes): string[] => {
  switch (metric) {
    case 'cpu':
      return ['k8sCpuUsage'];
    case 'memory':
      return ['k8sMemoryUsage'];
    default:
      return [];
  }
};

describe('useDockerContainerCharts', () => {
  describe.each<[ContainerMetricTypes]>([['cpu'], ['memory']])('%s', (item) => {
    test.each<[ContainerMetricTypes]>([[item]])(
      'should return an array of charts with correct order for metric "%s"',
      async (metric) => {
        const expectedOrder = getContainerChartsExpectedOrder(metric);

        const { result, waitForNextUpdate } = renderHook(() =>
          useDockerContainerPageViewMetricsCharts({ metricsDataViewId, metric })
        );
        await waitForNextUpdate();

        const { charts } = result.current;

        expect(charts).toHaveLength(expectedOrder.length);

        charts.forEach((chart, index) => {
          expect(chart).toHaveProperty('id', expectedOrder[index]);
        });
      }
    );
  });
});

describe('useDockerKPIMetricsCharts', () => {
  it('should return an array of charts with correct order', async () => {
    const expectedOrder = ['cpuUsage', 'memoryUsage'];
    const { result, waitForNextUpdate } = renderHook(() =>
      useDockerContainerKpiCharts({ dataViewId: metricsDataViewId })
    );
    await waitForNextUpdate();
    expect(result.current).toHaveLength(expectedOrder.length);
    result.current.forEach((chart, index) => {
      expect(chart).toHaveProperty('id', expectedOrder[index]);
    });
  });
});

describe('useK8sContainerCharts', () => {
  describe.each<[ContainerMetricTypes]>([['cpu'], ['memory']])('%s', (item) => {
    test.each<[ContainerMetricTypes]>([[item]])(
      'should return an array of charts with correct order for metric "%s"',
      async (metric) => {
        const expectedOrder = getK8sContainerChartsExpectedOrder(metric);

        const { result, waitForNextUpdate } = renderHook(() =>
          useK8sContainerPageViewMetricsCharts({ metricsDataViewId, metric })
        );
        await waitForNextUpdate();

        const { charts } = result.current;

        expect(charts).toHaveLength(expectedOrder.length);

        charts.forEach((chart, index) => {
          expect(chart).toHaveProperty('id', expectedOrder[index]);
        });
      }
    );
  });
});

describe('useK8sContainerKPIMetricsCharts', () => {
  it('should return an array of charts with correct order', async () => {
    const expectedOrder = ['k8sCpuUsage', 'k8sMemoryUsage'];
    const { result, waitForNextUpdate } = renderHook(() =>
      useK8sContainerKpiCharts({ dataViewId: metricsDataViewId })
    );
    await waitForNextUpdate();
    expect(result.current).toHaveLength(expectedOrder.length);
    result.current.forEach((chart, index) => {
      expect(chart).toHaveProperty('id', expectedOrder[index]);
    });
  });
});
