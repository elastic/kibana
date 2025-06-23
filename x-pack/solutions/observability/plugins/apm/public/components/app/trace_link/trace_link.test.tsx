/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useKibana: jest.fn().mockReturnValue({
    services: {
      data: {
        query: { timefilter: { timefilter: { getTime: () => ({ from: 'now-1h', to: 'now' }) } } },
      },
    },
  }),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Redirect: jest.fn(({ to }) => (
    <a href={to} data-test-subj="redirect-link">
      Test link
    </a>
  )),
}));

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <MemoryRouter>
      <MockApmPluginContextWrapper
        value={
          {
            ...mockApmPluginContextValue,
            core: {
              ...mockApmPluginContextValue.core,
              http: { ...mockApmPluginContextValue.core.http, get: jest.fn() },
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
    jest.clearAllMocks();
  });

  it('renders loading state while fetching trace', async () => {
    jest.spyOn(useApmParamsHooks as any, 'useApmParams').mockReturnValue({
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
    jest.spyOn(hooks, 'useFetcher').mockReturnValue({
      data: { transaction: undefined },
      status: hooks.FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });

    jest.spyOn(useApmParamsHooks as any, 'useApmParams').mockReturnValue({
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

    jest.spyOn(hooks, 'useFetcher').mockReturnValue({
      data: { transaction },
      status: hooks.FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });

    jest.spyOn(useApmParamsHooks as any, 'useApmParams').mockReturnValue({
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

  it('uses time range from data plugin when not provided in query', () => {
    jest.spyOn(useApmParamsHooks as any, 'useApmParams').mockReturnValue({
      path: { traceId: '123' },
      query: {},
    });

    render(<TraceLink />, { wrapper: Wrapper });

    const link = screen.getByTestId('redirect-link');
    expect(link).toHaveAttribute(
      'href',
      '/services/foo/transactions/view?traceId=123&transactionId=456&transactionName=bar&transactionType=GET&rangeFrom=now-1h&rangeTo=now&waterfallItemId='
    );
  });
});
