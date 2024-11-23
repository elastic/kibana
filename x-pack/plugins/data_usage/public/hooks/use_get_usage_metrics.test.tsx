/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQuery as _useQuery } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-hooks';
import { useGetDataUsageMetrics } from './use_get_usage_metrics';
import { DATA_USAGE_METRICS_API_ROUTE } from '../../common';
import { coreMock as mockCore } from '@kbn/core/public/mocks';
import { dataUsageTestQueryClientOptions, timeXMinutesAgo } from '../../common/test_utils';

const useQueryMock = _useQuery as jest.Mock;

jest.mock('@tanstack/react-query', () => {
  const actualReactQueryModule = jest.requireActual('@tanstack/react-query');

  return {
    ...actualReactQueryModule,
    useQuery: jest.fn((...args) => actualReactQueryModule.useQuery(...args)),
  };
});

const mockServices = mockCore.createStart();
const createWrapper = () => {
  const queryClient = new QueryClient(dataUsageTestQueryClientOptions);
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

jest.mock('../utils/use_kibana', () => {
  return {
    useKibanaContextForPlugin: () => ({
      services: mockServices,
    }),
  };
});

const defaultUsageMetricsRequestBody = {
  from: timeXMinutesAgo(15),
  to: timeXMinutesAgo(0),
  metricTypes: ['ingest_rate'],
  dataStreams: ['ds-1'],
};

describe('useGetDataUsageMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call the correct API', async () => {
    await renderHook(
      () => useGetDataUsageMetrics(defaultUsageMetricsRequestBody, { enabled: true }),
      {
        wrapper: createWrapper(),
      }
    );

    expect(mockServices.http.post).toHaveBeenCalledWith(DATA_USAGE_METRICS_API_ROUTE, {
      signal: expect.any(AbortSignal),
      version: '1',
      body: JSON.stringify(defaultUsageMetricsRequestBody),
    });
  });

  it('should not call the API if disabled', async () => {
    await renderHook(
      () => useGetDataUsageMetrics(defaultUsageMetricsRequestBody, { enabled: false }),
      {
        wrapper: createWrapper(),
      }
    );

    expect(mockServices.http.post).not.toHaveBeenCalled();
  });

  it('should allow custom options to be used', async () => {
    await renderHook(
      () =>
        useGetDataUsageMetrics(defaultUsageMetricsRequestBody, {
          queryKey: ['test-query-key'],
          enabled: true,
          retry: false,
        }),
      {
        wrapper: createWrapper(),
      }
    );

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['test-query-key'],
        enabled: true,
        retry: false,
      })
    );
  });
});
