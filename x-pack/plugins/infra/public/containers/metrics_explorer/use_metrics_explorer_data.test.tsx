/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetch } from '../../utils/fetch';
import { useMetricsExplorerData } from './use_metrics_explorer_data';
import { MetricsExplorerAggregation } from '../../../server/routes/metrics_explorer/types';

import { renderHook } from 'react-hooks-testing-library';

import {
  options,
  source,
  derivedIndexPattern,
  timeRange,
  resp,
  createSeries,
} from '../../utils/fixtures/metrics_explorer';

const renderUseMetricsExplorerDataHook = () =>
  renderHook(
    props =>
      useMetricsExplorerData(
        props.options,
        props.source,
        props.derivedIndexPattern,
        props.timeRange,
        props.afterKey,
        props.signal
      ),
    {
      initialProps: {
        options,
        source,
        derivedIndexPattern,
        timeRange,
        afterKey: null as string | null,
        signal: 1,
      },
    }
  );

jest.mock('../../utils/fetch');
const mockedFetch = fetch as jest.Mocked<typeof fetch>;
describe('useMetricsExplorerData Hook', () => {
  it('should just work', async () => {
    mockedFetch.post.mockResolvedValue({ data: resp } as any);
    const { result, waitForNextUpdate } = renderUseMetricsExplorerDataHook();
    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(true);
    await waitForNextUpdate();
    expect(result.current.data).toEqual(resp);
    expect(result.current.loading).toBe(false);
    const { series } = result.current.data!;
    expect(series).toBeDefined();
    expect(series.length).toBe(3);
  });

  it('should paginate', async () => {
    mockedFetch.post.mockResolvedValue({ data: resp } as any);
    const { result, waitForNextUpdate, rerender } = renderUseMetricsExplorerDataHook();
    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(true);
    await waitForNextUpdate();
    expect(result.current.data).toEqual(resp);
    expect(result.current.loading).toBe(false);
    const { series, pageInfo } = result.current.data!;
    expect(series).toBeDefined();
    expect(series.length).toBe(3);
    mockedFetch.post.mockResolvedValue({
      data: {
        pageInfo: { total: 10, afterKey: 'host-06' },
        series: [createSeries('host-04'), createSeries('host-05'), createSeries('host-06')],
      },
    } as any);
    rerender({
      options,
      source,
      derivedIndexPattern,
      timeRange,
      afterKey: pageInfo.afterKey!,
      signal: 1,
    });
    expect(result.current.loading).toBe(true);
    await waitForNextUpdate();
    expect(result.current.loading).toBe(false);
    const { series: nextSeries } = result.current.data!;
    expect(nextSeries).toBeDefined();
    expect(nextSeries.length).toBe(6);
  });

  it('should reset error upon recovery', async () => {
    const error = new Error('Network Error');
    mockedFetch.post.mockRejectedValue(error);
    const { result, waitForNextUpdate, rerender } = renderUseMetricsExplorerDataHook();
    expect(result.current.data).toBe(null);
    expect(result.current.error).toEqual(null);
    expect(result.current.loading).toBe(true);
    await waitForNextUpdate();
    expect(result.current.data).toEqual(null);
    expect(result.current.error).toEqual(error);
    expect(result.current.loading).toBe(false);
    mockedFetch.post.mockResolvedValue({ data: resp } as any);
    rerender({
      options,
      source,
      derivedIndexPattern,
      timeRange,
      afterKey: null,
      signal: 2,
    });
    await waitForNextUpdate();
    expect(result.current.data).toEqual(resp);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should not paginate on option change', async () => {
    mockedFetch.post.mockResolvedValue({ data: resp } as any);
    const { result, waitForNextUpdate, rerender } = renderUseMetricsExplorerDataHook();
    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(true);
    await waitForNextUpdate();
    expect(result.current.data).toEqual(resp);
    expect(result.current.loading).toBe(false);
    const { series, pageInfo } = result.current.data!;
    expect(series).toBeDefined();
    expect(series.length).toBe(3);
    mockedFetch.post.mockResolvedValue({ data: resp } as any);
    rerender({
      options: {
        ...options,
        aggregation: MetricsExplorerAggregation.count,
        metrics: [{ aggregation: MetricsExplorerAggregation.count }],
      },
      source,
      derivedIndexPattern,
      timeRange,
      afterKey: pageInfo.afterKey!,
      signal: 1,
    });
    expect(result.current.loading).toBe(true);
    await waitForNextUpdate();
    expect(result.current.data).toEqual(resp);
    expect(result.current.loading).toBe(false);
  });

  it('should not paginate on time change', async () => {
    mockedFetch.post.mockResolvedValue({ data: resp } as any);
    const { result, waitForNextUpdate, rerender } = renderUseMetricsExplorerDataHook();
    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(true);
    await waitForNextUpdate();
    expect(result.current.data).toEqual(resp);
    expect(result.current.loading).toBe(false);
    const { series, pageInfo } = result.current.data!;
    expect(series).toBeDefined();
    expect(series.length).toBe(3);
    mockedFetch.post.mockResolvedValue({ data: resp } as any);
    rerender({
      options,
      source,
      derivedIndexPattern,
      timeRange: { from: 'now-1m', to: 'now', interval: '>=1m' },
      afterKey: pageInfo.afterKey!,
      signal: 1,
    });
    expect(result.current.loading).toBe(true);
    await waitForNextUpdate();
    expect(result.current.data).toEqual(resp);
    expect(result.current.loading).toBe(false);
  });
});
