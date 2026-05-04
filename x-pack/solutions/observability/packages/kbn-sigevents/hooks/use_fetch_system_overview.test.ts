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
  const mockHttpFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockHttpFetch.mockResolvedValue({
      features: [
        {
          type: 'entity',
          subtype: 'service',
          properties: { name: 'checkout-api', technology: 'go' },
        },
        {
          type: 'entity',
          subtype: 'service',
          properties: { name: 'payment-service', technology: 'java' },
        },
        {
          type: 'entity',
          subtype: 'database',
          properties: { name: 'orders-db', technology: 'postgresql' },
        },
        {
          type: 'entity',
          subtype: 'cache',
          properties: { name: 'redis-cache', technology: 'redis' },
        },
        { type: 'technology', properties: { name: 'go' } },
        { type: 'technology', properties: { name: 'postgresql' } },
        { type: 'dependency', properties: { source: 'checkout-api', target: 'orders-db' } },
      ],
    });

    mockSearch.mockImplementation(({ params }: { params: { index: string; size?: number } }) => {
      if (params.index === 'sigevents-events-ms' && params.size === 5) {
        return of({
          rawResponse: {
            hits: {
              hits: acknowledgedDocs.map((doc) => ({ _source: doc })),
              total: { value: acknowledgedDocs.length, relation: 'eq' },
            },
          },
        });
      }
      if (params.index === 'sigevents-events-ms' && params.size === 0) {
        return of({
          rawResponse: {
            hits: { hits: [], total: { value: 0, relation: 'eq' } },
            aggregations: {
              by_impact: {
                buckets: [
                  {
                    key: 'medium',
                    doc_count: 1,
                    by_verdict: {
                      buckets: [{ key: 'acknowledged', doc_count: 1 }],
                    },
                  },
                  {
                    key: 'low',
                    doc_count: 2,
                    by_verdict: {
                      buckets: [
                        { key: 'acknowledged', doc_count: 1 },
                        { key: 'demoted', doc_count: 1 },
                      ],
                    },
                  },
                ],
              },
            },
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
        http: { fetch: mockHttpFetch },
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

  it('counts services, entities, and technologies from KI features', async () => {
    const { result } = renderHook(() => useFetchSystemOverview(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.data).not.toBeNull();

    // 2 service entities, 4 total entities, 2 technologies
    expect(result.current.data!.serviceCount).toBe(2);
    expect(result.current.data!.entityCount).toBe(4);
    expect(result.current.data!.technologyCount).toBe(2);
  });

  it('returns zero for all counts when features API fails', async () => {
    mockHttpFetch.mockRejectedValue(new Error('Forbidden'));

    const { result } = renderHook(() => useFetchSystemOverview(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data!.serviceCount).toBe(0);
    expect(result.current.data!.entityCount).toBe(0);
    expect(result.current.data!.technologyCount).toBe(0);
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

  it('counts sigEvents by priority from impact agg', async () => {
    const { result } = renderHook(() => useFetchSystemOverview(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const { sigEventsByPriority } = result.current.data!;
    expect(sigEventsByPriority.critical).toEqual({ open: 0, resolved: 0 });
    expect(sigEventsByPriority.high).toEqual({ open: 0, resolved: 0 });
    expect(sigEventsByPriority.medium).toEqual({ open: 1, resolved: 0 });
    expect(sigEventsByPriority.low).toEqual({ open: 1, resolved: 1 });
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

  it('skips unknown impact bucket keys without crashing', async () => {
    mockSearch.mockImplementation(({ params }: { params: { index: string; size?: number } }) => {
      if (params.index === 'sigevents-events-ms' && params.size === 5) {
        return of({
          rawResponse: {
            hits: { hits: [], total: { value: 0, relation: 'eq' } },
          },
        });
      }
      if (params.index === 'sigevents-events-ms' && params.size === 0) {
        return of({
          rawResponse: {
            hits: { hits: [], total: { value: 0, relation: 'eq' } },
            aggregations: {
              by_impact: {
                buckets: [
                  {
                    key: 'unknown_priority',
                    doc_count: 5,
                    by_verdict: { buckets: [{ key: 'promoted', doc_count: 5 }] },
                  },
                  {
                    key: 'critical',
                    doc_count: 2,
                    by_verdict: { buckets: [{ key: 'promoted', doc_count: 2 }] },
                  },
                ],
              },
            },
          },
        });
      }
      return of({ rawResponse: { hits: { hits: [], total: { value: 0, relation: 'eq' } } } });
    });

    const { result } = renderHook(() => useFetchSystemOverview(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Unknown priority is skipped; critical gets counted
    expect(result.current.data!.sigEventsByPriority.critical).toEqual({ open: 2, resolved: 0 });
  });

  it('handles missing aggregations gracefully (null responses)', async () => {
    mockHttpFetch.mockResolvedValue({ features: [] });

    mockSearch.mockImplementation(({ params }: { params: { index: string; size?: number } }) => {
      if (params.index === 'sigevents-events-ms' && params.size === 5) {
        return of({
          rawResponse: {
            hits: { hits: [], total: { value: 0, relation: 'eq' } },
          },
        });
      }
      if (params.index === 'sigevents-events-ms' && params.size === 0) {
        return of({
          rawResponse: {
            hits: { hits: [], total: { value: 0, relation: 'eq' } },
            aggregations: undefined,
          },
        });
      }
      return of({ rawResponse: { hits: { hits: [], total: { value: 0, relation: 'eq' } } } });
    });

    const { result } = renderHook(() => useFetchSystemOverview(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data!.serviceCount).toBe(0);
    expect(result.current.data!.sigEventsByPriority.critical).toEqual({ open: 0, resolved: 0 });
  });
});
