/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMetricsExplorerData } from './use_metrics_explorer_data';

import { renderHook } from '@testing-library/react-hooks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import {
  options,
  source,
  derivedIndexPattern,
  timestamps,
  resp,
  createSeries,
} from '../../../../utils/fixtures/metrics_explorer';
import { MetricsExplorerOptions, MetricsExplorerTimestamp } from './use_metrics_explorer_options';
import { DataViewBase } from '@kbn/es-query';
import { MetricsSourceConfigurationProperties } from '../../../../../common/metrics_sources';

const mockedFetch = jest.fn();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});

const renderUseMetricsExplorerDataHook = () => {
  const wrapper: React.FC = ({ children }) => {
    const services = {
      http: {
        post: mockedFetch,
      },
    };
    return (
      <QueryClientProvider client={queryClient}>
        <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
      </QueryClientProvider>
    );
  };
  return renderHook(
    (props: {
      options: MetricsExplorerOptions;
      source: MetricsSourceConfigurationProperties | undefined;
      derivedIndexPattern: DataViewBase;
      timestamps: MetricsExplorerTimestamp;
    }) =>
      useMetricsExplorerData(
        props.options,
        props.source,
        props.derivedIndexPattern,
        props.timestamps
      ),
    {
      initialProps: {
        options,
        source,
        derivedIndexPattern,
        timestamps,
      },
      wrapper,
    }
  );
};

jest.mock('../../../../utils/kuery', () => {
  return {
    convertKueryToElasticSearchQuery: (query: string) => query,
  };
});

describe('useMetricsExplorerData Hook', () => {
  afterEach(() => {
    queryClient.clear();
  });

  it('should just work', async () => {
    mockedFetch.mockResolvedValue(resp);
    const { result, waitForNextUpdate } = renderUseMetricsExplorerDataHook();

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);

    await waitForNextUpdate();

    expect(result.current.data!.pages[0]).toEqual(resp);
    expect(result.current.isLoading).toBe(false);
    const { series } = result.current.data!.pages[0];
    expect(series).toBeDefined();
    expect(series.length).toBe(3);
  });

  it('should paginate', async () => {
    mockedFetch.mockResolvedValue(resp);
    const { result, waitForNextUpdate } = renderUseMetricsExplorerDataHook();
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
    await waitForNextUpdate();
    expect(result.current.data!.pages[0]).toEqual(resp);
    expect(result.current.isLoading).toBe(false);
    const { series } = result.current.data!.pages[0];
    expect(series).toBeDefined();
    expect(series.length).toBe(3);
    mockedFetch.mockResolvedValue({
      pageInfo: { total: 10, afterKey: 'host-06' },
      series: [createSeries('host-04'), createSeries('host-05'), createSeries('host-06')],
    } as any);
    result.current.fetchNextPage();
    await waitForNextUpdate();
    expect(result.current.isLoading).toBe(false);
    const { series: nextSeries } = result.current.data!.pages[1];
    expect(nextSeries).toBeDefined();
    expect(nextSeries.length).toBe(3);
  });

  it('should reset error upon recovery', async () => {
    const error = new Error('Network Error');
    mockedFetch.mockRejectedValue(error);
    const { result, waitForNextUpdate } = renderUseMetricsExplorerDataHook();
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toEqual(null);
    expect(result.current.isLoading).toBe(true);
    await waitForNextUpdate();
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toEqual(error);
    expect(result.current.isLoading).toBe(false);
    mockedFetch.mockResolvedValue(resp as any);
    result.current.refetch();
    await waitForNextUpdate();
    expect(result.current.data!.pages[0]).toEqual(resp);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should not paginate on option change', async () => {
    mockedFetch.mockResolvedValue(resp as any);
    const { result, waitForNextUpdate, rerender } = renderUseMetricsExplorerDataHook();
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
    await waitForNextUpdate();
    expect(result.current.data!.pages[0]).toEqual(resp);
    expect(result.current.isLoading).toBe(false);
    const { series } = result.current.data!.pages[0];
    expect(series).toBeDefined();
    expect(series.length).toBe(3);
    mockedFetch.mockResolvedValue(resp as any);
    rerender({
      options: {
        ...options,
        aggregation: 'count',
        metrics: [{ aggregation: 'count' }],
      },
      source,
      derivedIndexPattern,
      timestamps,
    });
    expect(result.current.isLoading).toBe(true);
    await waitForNextUpdate();
    expect(result.current.data!.pages[0]).toEqual(resp);
    expect(result.current.isLoading).toBe(false);
  });

  it('should not paginate on time change', async () => {
    mockedFetch.mockResolvedValue(resp as any);
    const { result, waitForNextUpdate, rerender } = renderUseMetricsExplorerDataHook();
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
    await waitForNextUpdate();
    expect(result.current.data!.pages[0]).toEqual(resp);
    expect(result.current.isLoading).toBe(false);
    const { series } = result.current.data!.pages[0];
    expect(series).toBeDefined();
    expect(series.length).toBe(3);
    mockedFetch.mockResolvedValue(resp as any);
    rerender({
      options,
      source,
      derivedIndexPattern,
      timestamps: { fromTimestamp: 1678378092225, toTimestamp: 1678381693477, interval: '>=10s' },
    });
    expect(result.current.isLoading).toBe(true);
    await waitForNextUpdate();
    expect(result.current.data!.pages[0]).toEqual(resp);
    expect(result.current.isLoading).toBe(false);
  });
});
