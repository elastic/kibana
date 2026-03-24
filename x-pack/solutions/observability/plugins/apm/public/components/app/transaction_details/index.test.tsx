/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TransactionDetails } from '.';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useApmRoutePath } from '../../../hooks/use_apm_route_path';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

jest.mock('../../../hooks/use_apm_params', () => ({
  useAnyOfApmParams: jest.fn(),
}));

jest.mock('../../../hooks/use_apm_route_path', () => ({
  useApmRoutePath: jest.fn(),
}));

jest.mock('../../../hooks/use_apm_router', () => ({
  useApmRouter: jest.fn(),
}));

jest.mock('../../../hooks/use_time_range', () => ({
  useTimeRange: () => ({ start: '2024-01-01', end: '2024-01-02' }),
}));

jest.mock('../../../context/apm_service/use_apm_service_context', () => ({
  useApmServiceContext: () => ({
    transactionType: 'request',
    fallbackToTransactions: false,
    serverlessType: undefined,
    serviceName: 'test-service',
  }),
}));

jest.mock('../../../context/breadcrumbs/use_breadcrumb', () => ({
  useBreadcrumb: () => {},
}));

const mockHistory = {
  replace: jest.fn(),
  push: jest.fn(),
  location: { pathname: '/services/test/transactions/view', search: '?transactionName=test' },
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => mockHistory,
}));

jest.mock('../../shared/charts/transaction_charts', () => ({
  TransactionCharts: () => null,
}));

jest.mock('./transaction_details_tabs', () => ({
  TransactionDetailsTabs: () => null,
}));

jest.mock('../../../context/chart_pointer_event/chart_pointer_event_context', () => ({
  ChartPointerEventContextProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock('../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: jest.fn(),
}));

const mockUseAnyOfApmParams = useAnyOfApmParams as jest.Mock;
const mockUseApmRoutePath = useApmRoutePath as jest.Mock;
const mockUseApmRouter = useApmRouter as jest.Mock;
const mockUseApmPluginContext = useApmPluginContext as jest.Mock;

const mockSetAgentBuilderChatConfig = jest.fn();
const mockClearAgentBuilderChatConfig = jest.fn();

const baseQuery = {
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  comparisonEnabled: false,
  showCriticalPath: '',
  environment: 'ENVIRONMENT_ALL',
  kuery: '',
  offset: undefined,
};

describe('TransactionDetails', () => {
  const mockLink = jest.fn(
    (path: string, opts: { path: { serviceName: string }; query: object }) => {
      const qs = new URLSearchParams(opts.query as Record<string, string>).toString();
      return `/app/apm${path.replace('{serviceName}', opts.path.serviceName)}${qs ? `?${qs}` : ''}`;
    }
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApmRouter.mockReturnValue({ link: mockLink });
    mockUseApmPluginContext.mockReturnValue({ agentBuilder: undefined });
  });

  it('redirects to transaction list when transactionName is undefined', () => {
    mockUseAnyOfApmParams.mockReturnValue({
      path: { serviceName: 'my-service' },
      query: { ...baseQuery, transactionName: undefined },
    });
    mockUseApmRoutePath.mockReturnValue('/services/{serviceName}/transactions/view');

    render(
      <MemoryRouter>
        <TransactionDetails />
      </MemoryRouter>
    );

    expect(mockLink).toHaveBeenCalledWith('/services/{serviceName}/transactions', {
      path: { serviceName: 'my-service' },
      query: expect.objectContaining({
        rangeFrom: 'now-15m',
        rangeTo: 'now',
        environment: 'ENVIRONMENT_ALL',
      }),
    });
  });

  it('redirects to transaction list when transactionName is empty string', () => {
    mockUseAnyOfApmParams.mockReturnValue({
      path: { serviceName: 'my-service' },
      query: { ...baseQuery, transactionName: '' },
    });
    mockUseApmRoutePath.mockReturnValue('/services/{serviceName}/transactions/view');

    render(
      <MemoryRouter>
        <TransactionDetails />
      </MemoryRouter>
    );

    expect(mockLink).toHaveBeenCalledWith('/services/{serviceName}/transactions', {
      path: { serviceName: 'my-service' },
      query: expect.any(Object),
    });
  });

  it('redirects to mobile transaction list when on mobile route and transactionName is missing', () => {
    mockUseAnyOfApmParams.mockReturnValue({
      path: { serviceName: 'mobile-app' },
      query: { ...baseQuery, transactionName: undefined },
    });
    mockUseApmRoutePath.mockReturnValue('/mobile-services/{serviceName}/transactions/view');

    render(
      <MemoryRouter>
        <TransactionDetails />
      </MemoryRouter>
    );

    expect(mockLink).toHaveBeenCalledWith('/mobile-services/{serviceName}/transactions', {
      path: { serviceName: 'mobile-app' },
      query: expect.any(Object),
    });
  });

  it('redirects when transactionName is only whitespace', () => {
    mockUseAnyOfApmParams.mockReturnValue({
      path: { serviceName: 'my-service' },
      query: { ...baseQuery, transactionName: '   ' },
    });
    mockUseApmRoutePath.mockReturnValue('/services/{serviceName}/transactions/view');

    render(
      <MemoryRouter>
        <TransactionDetails />
      </MemoryRouter>
    );

    expect(mockLink).toHaveBeenCalledWith('/services/{serviceName}/transactions', {
      path: { serviceName: 'my-service' },
      query: expect.any(Object),
    });
  });

  it('does not redirect when transactionName is valid', () => {
    mockUseAnyOfApmParams.mockReturnValue({
      path: { serviceName: 'my-service' },
      query: { ...baseQuery, transactionName: 'GET /api/users' },
    });
    mockUseApmRoutePath.mockReturnValue('/services/{serviceName}/transactions/view');

    render(
      <MemoryRouter>
        <TransactionDetails />
      </MemoryRouter>
    );

    // Should not redirect to transaction list (path without /view)
    const redirectCalls = mockLink.mock.calls.filter(
      (call: [string, object]) => call[0] === '/services/{serviceName}/transactions'
    );
    expect(redirectCalls).toHaveLength(0);
    // Should render the transaction name in the heading
    expect(screen.getByRole('heading', { name: 'GET /api/users', level: 2 })).toBeInTheDocument();
  });

  it('renders without errors when agentBuilder is not available', () => {
    mockUseAnyOfApmParams.mockReturnValue({
      path: { serviceName: 'my-service' },
      query: {
        ...baseQuery,
        transactionName: 'GET /api/users',
        transactionType: 'request',
      },
    });
    mockUseApmRoutePath.mockReturnValue('/services/{serviceName}/transactions/view');
    mockUseApmPluginContext.mockReturnValue({ agentBuilder: undefined });

    render(
      <MemoryRouter>
        <TransactionDetails />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'GET /api/users', level: 2 })).toBeInTheDocument();
    expect(mockSetAgentBuilderChatConfig).not.toHaveBeenCalled();
  });

  it('configures agent builder with transaction attachment when agentBuilder is available', () => {
    mockUseAnyOfApmParams.mockReturnValue({
      path: { serviceName: 'my-service' },
      query: {
        ...baseQuery,
        transactionName: 'GET /api/users',
        transactionType: 'request',
        traceId: 'trace-123',
        transactionId: 'tx-456',
      },
    });
    mockUseApmRoutePath.mockReturnValue('/services/{serviceName}/transactions/view');
    mockUseApmPluginContext.mockReturnValue({
      agentBuilder: {
        setChatConfig: mockSetAgentBuilderChatConfig,
        clearChatConfig: mockClearAgentBuilderChatConfig,
      },
    });

    render(
      <MemoryRouter>
        <TransactionDetails />
      </MemoryRouter>
    );

    expect(mockSetAgentBuilderChatConfig).toHaveBeenCalledWith({
      agentId: 'observability.agent',
      attachments: [
        expect.objectContaining({
          type: 'observability.transaction',
          data: expect.objectContaining({
            serviceName: 'test-service',
            transactionName: 'GET /api/users',
            transactionType: 'request',
            traceId: 'trace-123',
            transactionId: 'tx-456',
          }),
        }),
      ],
    });
  });

  it('clears agent builder config on unmount', () => {
    mockUseAnyOfApmParams.mockReturnValue({
      path: { serviceName: 'my-service' },
      query: {
        ...baseQuery,
        transactionName: 'GET /api/users',
        transactionType: 'request',
      },
    });
    mockUseApmRoutePath.mockReturnValue('/services/{serviceName}/transactions/view');
    mockUseApmPluginContext.mockReturnValue({
      agentBuilder: {
        setChatConfig: mockSetAgentBuilderChatConfig,
        clearChatConfig: mockClearAgentBuilderChatConfig,
      },
    });

    const { unmount } = render(
      <MemoryRouter>
        <TransactionDetails />
      </MemoryRouter>
    );

    unmount();

    expect(mockClearAgentBuilderChatConfig).toHaveBeenCalled();
  });
});
