/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import type { LensXYConfig } from '@kbn/lens-embeddable-utils/config_builder';
import {
  useHostFlyoutViewMetricsCharts,
  useHostKpiCharts,
  useHostPageViewMetricsCharts,
  useKubernetesSectionMetricsCharts,
} from './use_metrics_charts';

const metricsDataViewId = 'metricsDataViewId';
const logsDataViewId = 'logsDataViewId';

describe('useHostFlyoutViewMetricsCharts', () => {
  it('should return an array of charts with correct order', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useHostFlyoutViewMetricsCharts({ metricsDataViewId, logsDataViewId })
    );
    await waitForNextUpdate();

    const expectedOrder = [
      'cpuUsage',
      'memoryUsage',
      'normalizedLoad1m',
      'logRate',
      'diskSpaceUsageAvailable',
      'diskUsageByMountPoint',
      'diskThroughputReadWrite',
      'diskIOReadWrite',
      'rxTx',
    ];

    expect(result.current).toHaveLength(expectedOrder.length);

    result.current.forEach((chart, index) => {
      expect(chart).toHaveProperty('id', expectedOrder[index]);
    });
  });

  it('should return a chart with id "logRate" using the logsDataViewId', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useHostFlyoutViewMetricsCharts({ metricsDataViewId, logsDataViewId })
    );
    await waitForNextUpdate();

    const logRateChart = result.current.find((chart) => chart.id === 'logRate') as LensXYConfig;
    expect(logRateChart).toBeDefined();
    expect(logRateChart.dataset).toHaveProperty('index', logsDataViewId);
  });
});

describe('useHostPageViewMetricsCharts', () => {
  it('should return an array of charts with correct order', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useHostPageViewMetricsCharts({ metricsDataViewId, logsDataViewId })
    );
    await waitForNextUpdate();

    const expectedOrder = [
      'cpuUsage',
      'cpuUsageBreakdown',
      'memoryUsage',
      'memoryUsageBreakdown',
      'normalizedLoad1m',
      'loadBreakdown',
      'logRate',
      'diskSpaceUsageAvailable',
      'diskUsageByMountPoint',
      'diskThroughputReadWrite',
      'diskIOReadWrite',
      'rxTx',
    ];

    expect(result.current).toHaveLength(expectedOrder.length);

    result.current.forEach((chart, index) => {
      expect(chart).toHaveProperty('id', expectedOrder[index]);
    });
  });

  it('should return a chart with id "logRate" using the logsDataViewId', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useHostPageViewMetricsCharts({ metricsDataViewId, logsDataViewId })
    );
    await waitForNextUpdate();

    const logRateChart = result.current.find((chart) => chart.id === 'logRate') as LensXYConfig;
    expect(logRateChart).toBeDefined();
    expect(logRateChart.dataset).toHaveProperty('index', logsDataViewId);
  });
});

describe('useKubernetesSectionMetricsCharts', () => {
  it('should return an array of charts with correct order', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useKubernetesSectionMetricsCharts({ metricsDataViewId })
    );
    await waitForNextUpdate();

    const expectedOrder = [
      'nodeCpuCapacity',
      'nodeMemoryCapacity',
      'nodeDiskCapacity',
      'nodePodCapacity',
    ];

    expect(result.current).toHaveLength(expectedOrder.length);

    result.current.forEach((chart, index) => {
      expect(chart).toHaveProperty('id', expectedOrder[index]);
    });
  });
});

describe('useHostKpiCharts', () => {
  it('should return an array of charts with correct order', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useHostKpiCharts({ dataViewId: metricsDataViewId })
    );
    await waitForNextUpdate();

    const expectedOrder = ['cpuUsage', 'normalizedLoad1m', 'memoryUsage', 'diskUsage'];

    expect(result.current).toHaveLength(expectedOrder.length);

    result.current.forEach((chart, index) => {
      expect(chart).toHaveProperty('id', expectedOrder[index]);
      expect(chart).toHaveProperty('subtitle', 'Average');
      expect(chart).toHaveProperty('decimals', 1);
    });
  });

  it('should return an array of charts with correct options', async () => {
    const options = {
      seriesColor: 'blue',
      subtitle: 'Custom Subtitle',
    };

    const { result, waitForNextUpdate } = renderHook(() =>
      useHostKpiCharts({ dataViewId: metricsDataViewId, options })
    );
    await waitForNextUpdate();

    expect(result.current).toHaveLength(4);

    result.current.forEach((chart) => {
      expect(chart).toHaveProperty('seriesColor', options.seriesColor);
      expect(chart).toHaveProperty('subtitle', options.subtitle);
    });
  });
});
