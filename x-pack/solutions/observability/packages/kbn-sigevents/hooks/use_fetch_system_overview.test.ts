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

/**
 * Helper: build an ES|QL columnar response from an array of EventDocument objects.
 */
function makeEsqlEventsResponse(docs: Array<Record<string, unknown>>) {
  const columns = [
    '@timestamp',
    'event_id',
    'verdict_id',
    'discovery_id',
    'discovery_slug',
    'verdict',
    'title',
    'summary',
    'root_cause',
    'rule_names',
    'stream_names',
    'criticality',
    'impact',
    'recommendations',
    'recommended_action',
    'last_reviewed_at',
  ].map((name) => ({ name, type: 'keyword' }));

  const values = docs.map((doc) => columns.map((col) => doc[col.name] ?? null));

  return { columns, values };
}

function makeEsqlCountsResponse(
  counts: Array<{ count: number; severity_band: string; verdict: string }>
) {
  const columns = [
    { name: 'count', type: 'long' },
    { name: 'severity_band', type: 'keyword' },
    { name: 'verdict', type: 'keyword' },
  ];
  const values = counts.map((c) => [c.count, c.severity_band, c.verdict]);
  return { columns, values };
}

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

    mockSearch.mockImplementation(({ params }: { params: { query: string } }) => {
      if (params.query.includes('LIMIT 5')) {
        // Events query
        return of({
          rawResponse: makeEsqlEventsResponse(acknowledgedDocs),
        });
      }
      if (params.query.includes('STATS')) {
        // Counts query
        return of({
          rawResponse: makeEsqlCountsResponse([
            { count: 1, severity_band: 'medium', verdict: 'acknowledged' },
            { count: 1, severity_band: 'low', verdict: 'acknowledged' },
            { count: 1, severity_band: 'low', verdict: 'demoted' },
          ]),
        });
      }
      return of({ rawResponse: { columns: [], values: [] } });
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

  it('counts sigEvents by priority from ES|QL stats', async () => {
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
    mockSearch.mockImplementation(({ params }: { params: { query: string } }) => {
      if (params.query.includes('LIMIT 5')) {
        return of({ rawResponse: { columns: [], values: [] } });
      }
      if (params.query.includes('STATS')) {
        return of({
          rawResponse: makeEsqlCountsResponse([
            { count: 5, severity_band: 'unknown_priority', verdict: 'promoted' },
            { count: 2, severity_band: 'critical', verdict: 'promoted' },
          ]),
        });
      }
      return of({ rawResponse: { columns: [], values: [] } });
    });

    const { result } = renderHook(() => useFetchSystemOverview(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Unknown priority is skipped; critical gets counted
    expect(result.current.data!.sigEventsByPriority.critical).toEqual({ open: 2, resolved: 0 });
  });

  it('handles empty ES|QL responses gracefully', async () => {
    mockHttpFetch.mockResolvedValue({ features: [] });

    mockSearch.mockImplementation(() => {
      return of({ rawResponse: { columns: [], values: [] } });
    });

    const { result } = renderHook(() => useFetchSystemOverview(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data!.serviceCount).toBe(0);
    expect(result.current.data!.sigEventsByPriority.critical).toEqual({ open: 0, resolved: 0 });
  });
});
