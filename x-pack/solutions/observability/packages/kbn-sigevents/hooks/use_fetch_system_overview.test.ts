/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { of } from 'rxjs';
import { useFetchSystemOverview } from './use_fetch_system_overview';
import { makeAcknowledgedEvents } from '../__fixtures__/sigevents_test_data';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('@kbn/react-query', () => {
  const { QueryClient, QueryClientProvider } = jest.requireActual('@tanstack/react-query');
  return {
    useQuery: jest.requireActual('@tanstack/react-query').useQuery,
    QueryClient,
    QueryClientProvider,
  };
});

import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

const mockUseKibana = useKibana as jest.Mock;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const timestamp = '2026-04-30T19:30:00Z';

describe('useFetchSystemOverview', () => {
  const acknowledgedDocs = makeAcknowledgedEvents(timestamp);

  const mockSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockSearch.mockImplementation(({ params }: { params: { index: string } }) => {
      if (params.index === 'traces-*') {
        return of({
          rawResponse: {
            aggregations: {
              services: {
                buckets: [
                  { key: 'frontend', doc_count: 500 },
                  { key: 'payment', doc_count: 300 },
                  { key: 'checkout', doc_count: 200 },
                ],
              },
            },
            hits: { hits: [], total: { value: 0, relation: 'eq' } },
          },
        });
      }
      if (params.index === 'logs-*') {
        return of({
          rawResponse: {
            aggregations: {
              services: {
                buckets: [
                  { key: 'frontend', doc_count: 1000 },
                  { key: 'otel-collector', doc_count: 400 },
                ],
              },
            },
            hits: { hits: [], total: { value: 0, relation: 'eq' } },
          },
        });
      }
      if (params.index === 'sigevents-events-ms') {
        return of({
          rawResponse: {
            hits: {
              hits: acknowledgedDocs.map((doc) => ({ _source: doc })),
              total: { value: acknowledgedDocs.length, relation: 'eq' },
            },
          },
        });
      }
      if (params.index === 'sigevents-detections-ms') {
        return of({
          rawResponse: {
            hits: { hits: [], total: { value: 5, relation: 'eq' } },
          },
        });
      }
      return of({ rawResponse: { hits: { hits: [], total: { value: 0, relation: 'eq' } } } });
    });

    mockUseKibana.mockReturnValue({
      services: {
        data: {
          search: { search: mockSearch },
        },
      },
    });
  });

  it('returns loading true initially', () => {
    const { result } = renderHook(() => useFetchSystemOverview(), {
      wrapper: createWrapper(),
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it('merges trace and log service counts', async () => {
    const { result } = renderHook(() => useFetchSystemOverview(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.data).not.toBeNull();

    const { services } = result.current.data!;
    // Should have 4 unique services: frontend, payment, checkout, otel-collector
    expect(services).toHaveLength(4);

    const frontend = services.find((s) => s.name === 'frontend');
    expect(frontend).toEqual({ name: 'frontend', traceCount: 500, logCount: 1000 });

    const payment = services.find((s) => s.name === 'payment');
    expect(payment).toEqual({ name: 'payment', traceCount: 300, logCount: 0 });

    const otelCollector = services.find((s) => s.name === 'otel-collector');
    expect(otelCollector).toEqual({ name: 'otel-collector', traceCount: 0, logCount: 400 });
  });

  it('sorts services by total count descending', async () => {
    const { result } = renderHook(() => useFetchSystemOverview(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const { services } = result.current.data!;
    // frontend: 1500, otel-collector: 400, payment: 300, checkout: 200
    expect(services[0].name).toBe('frontend');
    expect(services[1].name).toBe('otel-collector');
    expect(services[2].name).toBe('payment');
    expect(services[3].name).toBe('checkout');
  });

  it('returns acknowledged events', async () => {
    const { result } = renderHook(() => useFetchSystemOverview(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data!.acknowledgedEvents).toHaveLength(2);
    expect(result.current.data!.acknowledgedEvents[0].title).toBe(
      'multi-service — elevated stderr output'
    );
  });

  it('returns detection count from total hits', async () => {
    const { result } = renderHook(() => useFetchSystemOverview(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data!.detectionCount).toBe(5);
  });

  it('counts impact levels correctly', async () => {
    const { result } = renderHook(() => useFetchSystemOverview(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // From acknowledgedDocs: one medium (highCount=0, mediumCount=1) and one low (lowCount=1)
    expect(result.current.data!.highCount).toBe(0);
    expect(result.current.data!.mediumCount).toBe(1);
    expect(result.current.data!.lowCount).toBe(1);
  });

  it('returns error when search fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSearch.mockImplementation(() => {
      throw new Error('Search failed');
    });

    const { result } = renderHook(() => useFetchSystemOverview(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.data).toBeNull();
    (console.error as jest.Mock).mockRestore();
  });
});
