/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensSeriesLayer } from '@kbn/lens-embeddable-utils/config_builder';
import { renderHook } from '@testing-library/react';
import { PAGE_SIZE_OPTIONS } from '../constants';
import { useMetricsCharts } from './use_metrics_charts';

describe('useMetricsCharts', () => {
  it('should return an array of charts with breakdown config', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useMetricsCharts({ dataViewId: 'dataViewId' })
    );
    await waitForNextUpdate();

    expect(result.current).toHaveLength(11);

    result.current.forEach((chart) => {
      const seriesLayer = chart.layers.find((layer) => layer.type === 'series') as LensSeriesLayer;
      expect(seriesLayer).toHaveProperty('breakdown');
      expect(seriesLayer.breakdown).toHaveProperty('type', 'topValues');
      expect(seriesLayer.breakdown).toHaveProperty('field', 'host.name');
      expect(seriesLayer.breakdown).toHaveProperty('size', PAGE_SIZE_OPTIONS.at(-1));
    });
  });

  it('should return an array of charts with correct order', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useMetricsCharts({ dataViewId: 'dataViewId' })
    );
    await waitForNextUpdate();

    const expectedOrder = [
      'cpuUsage',
      'normalizedLoad1m',
      'memoryUsage',
      'memoryFree',
      'diskSpaceAvailable',
      'diskIORead',
      'diskIOWrite',
      'diskReadThroughput',
      'diskWriteThroughput',
      'rx',
      'tx',
    ];

    expect(result.current).toHaveLength(expectedOrder.length);

    result.current.forEach((chart, index) => {
      expect(chart).toHaveProperty('id', expectedOrder[index]);
    });
  });
});
