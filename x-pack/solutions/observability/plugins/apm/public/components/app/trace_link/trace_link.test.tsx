/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { TraceLink } from '.';
import type { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import {
  mockApmPluginContextValue,
  MockApmPluginContextWrapper,
} from '../../../context/apm_plugin/mock_apm_plugin_context';
import * as hooks from '../../../hooks/use_fetcher';
import * as useApmParamsHooks from '../../../hooks/use_apm_params';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@kbn/kibana-react-plugin/public', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/kibana-react-plugin/public')),
  };
  return { ...mocked, default: mocked };
});

vi.mock('react-router-dom', () => {
  const mocked = {
    ...require('react-router-dom'),
    Redirect: vi.fn(({ to }) => (
      <a href={to} data-test-subj="redirect-link">
        Test link
      </a>
    )),
  };
  return { ...mocked, default: mocked };
});

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <MemoryRouter>
      <MockApmPluginContextWrapper
        value={
          {
            ...mockApmPluginContextValue,
            core: {
              ...mockApmPluginContextValue.core,
              http: { ...mockApmPluginContextValue.core.http, get: vi.fn() },
            },
          } as unknown as ApmPluginContextValue
        }
      >
        {children}
      </MockApmPluginContextWrapper>
    </MemoryRouter>
  );
}

describe('TraceLink', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state while fetching trace', async () => {
    vi.spyOn(useApmParamsHooks as any, 'useApmParams').mockReturnValue({
      path: { traceId: 'x' },
      query: {
        rangeFrom: 'now-24h',
        rangeTo: 'now',
      },
    });

    render(<TraceLink />, { wrapper: Wrapper });
    waitFor(() => {});

    expect(screen.getByText('Fetching trace...')).toBeInTheDocument();
  });

  it('redirects to traces page when no transaction is found', () => {
    vi.spyOn(hooks, 'useFetcher').mockReturnValue({
      data: { transaction: undefined },
      status: hooks.FETCH_STATUS.SUCCESS,
      refetch: vi.fn(),
    });

    vi.spyOn(useApmParamsHooks as any, 'useApmParams').mockReturnValue({
      path: { traceId: '123' },
      query: {
        rangeFrom: 'now-24h',
        rangeTo: 'now',
      },
    });

    render(<TraceLink />, { wrapper: Wrapper });

    const link = screen.getByTestId('redirect-link');
    expect(link).toHaveAttribute(
      'href',
      '/traces?kuery=trace.id%20%3A%20%22123%22&rangeFrom=now-24h&rangeTo=now'
    );
  });

  it('redirects to transaction page with date range and waterfall params', () => {
    const transaction = {
      service: { name: 'foo' },
      transaction: {
        id: '456',
        name: 'bar',
        type: 'GET',
      },
      trace: { id: 123 },
    };

    vi.spyOn(hooks, 'useFetcher').mockReturnValue({
      data: { transaction },
      status: hooks.FETCH_STATUS.SUCCESS,
      refetch: vi.fn(),
    });

    vi.spyOn(useApmParamsHooks as any, 'useApmParams').mockReturnValue({
      path: { traceId: '123' },
      query: {
        rangeFrom: 'now-24h',
        rangeTo: 'now',
        waterfallItemId: '789',
      },
    });

    render(<TraceLink />, { wrapper: Wrapper });

    const link = screen.getByTestId('redirect-link');
    expect(link).toHaveAttribute(
      'href',
      '/services/foo/transactions/view?traceId=123&transactionId=456&transactionName=bar&transactionType=GET&rangeFrom=now-24h&rangeTo=now&waterfallItemId=789'
    );
  });

  it('calculates time range from transaction when not provided in query', () => {
    const transaction = {
      '@timestamp': '2024-01-01T12:00:00.000Z',
      service: { name: 'foo' },
      transaction: { id: '456', name: 'bar', type: 'GET', duration: { us: 1000 } },
      trace: { id: 123 },
    };

    vi.spyOn(hooks, 'useFetcher').mockReturnValue({
      data: { transaction },
      status: hooks.FETCH_STATUS.SUCCESS,
      refetch: vi.fn(),
    });

    vi.spyOn(useApmParamsHooks as any, 'useApmParams').mockReturnValue({
      path: { traceId: '123' },
      query: {},
    });

    render(<TraceLink />, { wrapper: Wrapper });

    const link = screen.getByTestId('redirect-link');
    // When no query params, dates are calculated from transaction timestamp (rounded to 5 min)
    expect(link).toHaveAttribute(
      'href',
      '/services/foo/transactions/view?traceId=123&transactionId=456&transactionName=bar&transactionType=GET&rangeFrom=2024-01-01T12%3A00%3A00.000Z&rangeTo=2024-01-01T12%3A05%3A00.000Z&waterfallItemId='
    );
  });
});
