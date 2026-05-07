/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { of } from 'rxjs';
import { useFetchLatestSignificantEvent } from './use_fetch_latest_significant_event';
import { makePromotedEvents } from '../__fixtures__/sigevents_test_data';

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

describe('useFetchLatestSignificantEvent', () => {
  const promotedDocs = makePromotedEvents(timestamp);

  const mockSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch.mockReturnValue(
      of({
        rawResponse: {
          hits: {
            hits: promotedDocs.map((doc) => ({ _source: doc })),
            total: { value: promotedDocs.length, relation: 'eq' },
          },
        },
      })
    );
    mockUseKibana.mockReturnValue({
      services: {
        data: {
          search: { search: mockSearch },
        },
      },
    });
  });

  it('returns loading true initially', () => {
    const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
      wrapper: createWrapper(),
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);
  });

  it('returns the highest-impact event as primary data', async () => {
    const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.data).not.toBeNull();
    // The critical event (payment failures, criticality 90) should be primary
    expect(result.current.data!.mainEventTitle).toBe('payment — charge processing failures');
    expect(result.current.data!.state).toBe('critical');
    expect(result.current.data!.severityLabel).toBe('Critical');
    expect(result.current.data!.severityColor).toBe('danger');
    expect(result.current.data!.blastRadiusScore).toBe(90);
  });

  it('returns other promoted events sorted by impact', async () => {
    const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.otherPromotedEvents).toHaveLength(1);
    expect(result.current.otherPromotedEvents[0].mainEventTitle).toBe(
      'frontend — gRPC connection failures'
    );
    expect(result.current.otherPromotedEvents[0].state).toBe('warning');
  });

  it('returns null data when search returns no hits', async () => {
    mockSearch.mockReturnValue(
      of({
        rawResponse: {
          hits: { hits: [], total: { value: 0, relation: 'eq' } },
        },
      })
    );

    const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.otherPromotedEvents).toHaveLength(0);
  });

  it('returns error when search fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSearch.mockImplementation(() => {
      throw new Error('Search failed');
    });

    const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error!.message).toBe('Search failed');
    expect(result.current.data).toBeNull();
    (console.error as jest.Mock).mockRestore();
  });

  it('maps blast_radius to impactedServices when present', async () => {
    const docWithBlastRadius = {
      ...promotedDocs[0],
      blast_radius: [
        { ki_id: 'svc-1', name: 'checkout', stream_name: 'logs.otel', confirmed: true },
        { ki_id: 'svc-2', name: 'payment', stream_name: 'logs.otel', confirmed: true },
        { ki_id: 'svc-3', name: 'shipping', stream_name: 'logs.otel', confirmed: false },
      ],
    };
    mockSearch.mockReturnValue(
      of({
        rawResponse: {
          hits: { hits: [{ _source: docWithBlastRadius }], total: { value: 1, relation: 'eq' } },
        },
      })
    );

    const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Only confirmed services are included
    expect(result.current.data!.impactedServices).toHaveLength(2);
    expect(result.current.data!.impactedServices[0].label).toBe('checkout');
    expect(result.current.data!.impactedServices[1].label).toBe('payment');
  });

  it('derives impactedServices from dependency_edges when blast_radius is absent', async () => {
    const docWithEdges = {
      ...promotedDocs[0],
      dependency_edges: [
        { source: 'checkout', target: 'payment', protocol: 'internal', exposure: 'exposed' },
      ],
      cause_kis: [{ name: 'payment-service', stream_name: 'logs.otel' }],
    };
    mockSearch.mockReturnValue(
      of({
        rawResponse: {
          hits: { hits: [{ _source: docWithEdges }], total: { value: 1, relation: 'eq' } },
        },
      })
    );

    const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Services derived from edges
    expect(result.current.data!.impactedServices).toHaveLength(2);
    expect(result.current.data!.impactedServices[0].label).toBe('checkout');
    expect(result.current.data!.impactedServices[1].label).toBe('payment');

    // Cards: cause_kis mapped without requiring confirmed, plus exposed edge source
    expect(result.current.data!.impactedCards).toHaveLength(2);
    expect(result.current.data!.impactedCards[0]).toMatchObject({
      label: 'Root Cause',
      value: 'payment-service',
    });
    expect(result.current.data!.impactedCards[1]).toMatchObject({
      label: 'Impacted',
      value: 'checkout',
    });
  });

  it('maps low impact to healthy state', async () => {
    const lowDoc = {
      ...promotedDocs[0],
      impact: 'low',
      criticality: 10,
    };
    mockSearch.mockReturnValue(
      of({
        rawResponse: {
          hits: { hits: [{ _source: lowDoc }], total: { value: 1, relation: 'eq' } },
        },
      })
    );

    const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data!.state).toBe('healthy');
    expect(result.current.data!.severityLabel).toBe('Low');
    expect(result.current.data!.severityColor).toBe('subdued');
  });

  it('maps low criticality score to healthy/Low state regardless of impact field', async () => {
    const unknownDoc = {
      ...promotedDocs[0],
      impact: 'something_else',
      criticality: 5,
    };
    mockSearch.mockReturnValue(
      of({
        rawResponse: {
          hits: { hits: [{ _source: unknownDoc }], total: { value: 1, relation: 'eq' } },
        },
      })
    );

    const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data!.state).toBe('healthy');
    expect(result.current.data!.severityLabel).toBe('Low');
    expect(result.current.data!.severityColor).toBe('subdued');
  });

  it('uses summary as description, falling back to first recommendation', async () => {
    const docNoSummary = {
      ...promotedDocs[0],
      summary: '',
      recommendations: ['Use this recommendation'],
    };
    mockSearch.mockReturnValue(
      of({
        rawResponse: {
          hits: { hits: [{ _source: docNoSummary }], total: { value: 1, relation: 'eq' } },
        },
      })
    );

    const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data!.description).toBe('Use this recommendation');
  });

  it('handles a minimal doc with missing optional fields', async () => {
    const minimalDoc = {
      '@timestamp': timestamp,
      event_id: 'minimal-1',
      discovery_id: 'd-1',
      discovery_slug: 'slug-1',
      verdict: 'promoted',
      title: 'Minimal event',
      impact: 'critical',
      verdict_id: 'v-1',
      last_reviewed_at: timestamp,
    };
    mockSearch.mockReturnValue(
      of({
        rawResponse: {
          hits: { hits: [{ _source: minimalDoc }], total: { value: 1, relation: 'eq' } },
        },
      })
    );

    const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).not.toBeNull();
    expect(result.current.data!.mainEventTitle).toBe('Minimal event');
    expect(result.current.data!.impactedServices).toHaveLength(0);
    expect(result.current.data!.impactedCards).toHaveLength(0);
    expect(result.current.data!.detailFields.summary).toBe('');
    expect(result.current.data!.detailFields.rootCause).toBe('');
    expect(result.current.data!.detailFields.recommendations).toHaveLength(0);
    expect(result.current.data!.detailFields.streamNames).toHaveLength(0);
    expect(result.current.data!.detailFields.evidences).toHaveLength(0);
    expect(result.current.data!.detailFields.dependencyEdges).toHaveLength(0);
    expect(result.current.data!.detailFields.causeKis).toHaveLength(0);
  });
});
