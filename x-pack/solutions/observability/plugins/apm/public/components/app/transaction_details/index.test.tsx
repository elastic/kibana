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

const mockUseAnyOfApmParams = useAnyOfApmParams as jest.Mock;
const mockUseApmRoutePath = useApmRoutePath as jest.Mock;
const mockUseApmRouter = useApmRouter as jest.Mock;

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
});
