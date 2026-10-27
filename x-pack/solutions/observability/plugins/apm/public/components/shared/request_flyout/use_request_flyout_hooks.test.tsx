/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { RequestFlyoutContextProvider } from './request_flyout_context';
import type { RequestFlyoutContextValue } from './request_flyout_context';
import { TEST_CONTEXT } from './test_utils';
import { useRequestFlyoutOperations } from './operations/use_request_flyout_operations';
import { useRequestFlyoutRedMetrics } from './red_metrics/use_request_flyout_red_metrics';
import { useRequestFlyoutResources } from './resources/use_request_flyout_resources';
import { ChartType, getTimeSeriesColor } from '../charts/helper/get_timeseries_color';

const mockUseFetcher = jest.fn();
jest.mock('../../../hooks/use_fetcher', () => ({
  ...jest.requireActual('../../../hooks/use_fetcher'),
  useFetcher: (...args: unknown[]) => mockUseFetcher(...args),
}));

const mockCallApmApi = jest.fn();

/** Runs the fetcher callback of the last `useFetcher` call and returns what it requested. */
function lastRequest() {
  const [callback] = mockUseFetcher.mock.calls[mockUseFetcher.mock.calls.length - 1];
  return callback(mockCallApmApi);
}

function wrapperWith(connection: Partial<RequestFlyoutContextValue['connection']>) {
  const value = { ...TEST_CONTEXT, connection: { ...TEST_CONTEXT.connection, ...connection } };
  return ({ children }: { children: React.ReactNode }) => (
    <RequestFlyoutContextProvider value={value}>{children}</RequestFlyoutContextProvider>
  );
}

describe('request flyout hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetcher.mockReturnValue({ data: undefined, status: 'success' });
  });

  describe('useRequestFlyoutOperations', () => {
    it('requests the operations of the source service on the dependency of the edge', () => {
      renderHook(() => useRequestFlyoutOperations(), { wrapper: wrapperWith({}) });

      lastRequest();

      expect(mockCallApmApi).toHaveBeenCalledWith(
        'GET /internal/apm/dependencies/operations',
        expect.objectContaining({
          params: {
            query: expect.objectContaining({
              dependencyName: 'postgresql',
              serviceName: 'frontend',
              environment: 'production',
            }),
          },
        })
      );
    });

    it('falls back to the first resource when the edge has no dependency name', () => {
      renderHook(() => useRequestFlyoutOperations(), {
        wrapper: wrapperWith({ dependencyName: undefined, dependencies: ['redis', 'kafka'] }),
      });

      lastRequest();

      expect(mockCallApmApi.mock.calls[0][1].params.query.dependencyName).toBe('redis');
    });

    it('does not fetch when there is no dependency, and is not loading', () => {
      mockUseFetcher.mockReturnValue({ data: undefined, status: 'not_initiated' });
      const { result } = renderHook(() => useRequestFlyoutOperations(), {
        wrapper: wrapperWith({ dependencyName: undefined, dependencies: [] }),
      });

      expect(lastRequest()).toBeUndefined();
      expect(mockCallApmApi).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('reports a failed request', () => {
      mockUseFetcher.mockReturnValue({ data: undefined, status: 'failure' });
      const { result } = renderHook(() => useRequestFlyoutOperations(), {
        wrapper: wrapperWith({}),
      });

      expect(result.current.hasError).toBe(true);
    });
  });

  describe('useRequestFlyoutRedMetrics', () => {
    const data = {
      currentPeriod: {
        transactionStats: {
          latency: { timeseries: [{ x: 1, y: 2 }] },
          throughput: { timeseries: [{ x: 1, y: 3 }] },
        },
        failedTransactionsRate: { timeseries: [{ x: 1, y: 0.1 }] },
      },
    };

    it.each([
      [LatencyAggregationType.avg, ChartType.LATENCY_AVG],
      [LatencyAggregationType.p95, ChartType.LATENCY_P95],
      [LatencyAggregationType.p99, ChartType.LATENCY_P99],
    ])('colours the latency series of %s by its aggregation', (aggregation, chartType) => {
      mockUseFetcher.mockReturnValue({ data, status: 'success' });
      const { result } = renderHook(
        () => useRequestFlyoutRedMetrics({ latencyAggregationType: aggregation }),
        { wrapper: wrapperWith({}) }
      );

      expect(result.current.latencyTimeseries[0].color).toBe(
        getTimeSeriesColor(chartType).currentPeriodColor
      );
    });

    it('asks the route for the selected aggregation', () => {
      renderHook(
        () => useRequestFlyoutRedMetrics({ latencyAggregationType: LatencyAggregationType.p99 }),
        { wrapper: wrapperWith({}) }
      );

      lastRequest();

      expect(mockCallApmApi).toHaveBeenCalledWith(
        'GET /internal/apm/service-map/dependency',
        expect.objectContaining({
          params: {
            query: expect.objectContaining({
              sourceServiceName: 'frontend',
              dependencies: ['postgresql'],
              latencyAggregationType: LatencyAggregationType.p99,
            }),
          },
        })
      );
    });

    it('has no series while there is no data', () => {
      const { result } = renderHook(
        () => useRequestFlyoutRedMetrics({ latencyAggregationType: LatencyAggregationType.avg }),
        { wrapper: wrapperWith({}) }
      );

      expect(result.current.latencyTimeseries).toEqual([]);
      expect(result.current.throughputTimeseries).toEqual([]);
      expect(result.current.errorRateTimeseries).toEqual([]);
    });
  });

  describe('useRequestFlyoutResources', () => {
    it('requests the dependencies of the source service with a single bucket', () => {
      renderHook(() => useRequestFlyoutResources(), {
        wrapper: wrapperWith({ groupedResources: [] }),
      });

      lastRequest();

      expect(mockCallApmApi).toHaveBeenCalledWith(
        'GET /internal/apm/services/{serviceName}/dependencies',
        expect.objectContaining({
          params: {
            path: { serviceName: 'frontend' },
            query: expect.objectContaining({ numBuckets: 1 }),
          },
        })
      );
    });

    it('caps the rows at ten resources, most time consumed first, and reports the total', () => {
      const groupedResources = Array.from({ length: 15 }, (_, i) => ({
        id: `resource-${i}`,
        label: `resource-${i}`,
        resource: `resource-${i}`,
        spanType: 'external',
        spanSubtype: 'http',
      }));
      mockUseFetcher.mockReturnValue({
        data: {
          serviceDependencies: groupedResources.map(({ id }, i) => ({
            location: {
              id,
              dependencyName: id,
              type: 'dependency',
              spanType: 'external',
              spanSubtype: 'http',
            },
            currentStats: {
              latency: { value: 10 },
              throughput: { value: 1 },
              errorRate: { value: 0 },
              totalTime: { value: 15 - i },
              impact: 1,
            },
          })),
        },
        status: 'success',
      });
      const { result } = renderHook(() => useRequestFlyoutResources(), {
        wrapper: wrapperWith({ groupedResources: groupedResources as any }),
      });

      expect(result.current.totalResources).toBe(15);
      // The ten resources with the most time consumed, in order.
      expect(result.current.items.map(({ resource }) => resource)).toEqual(
        Array.from({ length: 10 }, (_, i) => `resource-${i}`)
      );
    });

    it('drops the dependencies that are not resources of the grouped edge', () => {
      mockUseFetcher.mockReturnValue({
        data: {
          serviceDependencies: [
            {
              location: { id: 'other', dependencyName: 'other', type: 'dependency' },
              currentStats: {
                latency: { value: 10 },
                throughput: { value: 1 },
                errorRate: { value: 0 },
                totalTime: { value: 1 },
                impact: 1,
              },
            },
          ],
        },
        status: 'success',
      });
      const { result } = renderHook(() => useRequestFlyoutResources(), {
        wrapper: wrapperWith({
          groupedResources: [{ id: 'a', label: 'a', resource: 'a' }] as any,
        }),
      });

      expect(result.current.items).toEqual([]);
    });
  });
});
