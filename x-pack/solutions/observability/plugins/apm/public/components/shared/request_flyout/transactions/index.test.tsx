/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { RequestFlyoutChildProvider } from '../request_flyout_child';
import { RequestFlyoutContextProvider } from '../request_flyout_context';
import type { RequestFlyoutContextValue } from '../request_flyout_context';
import { TEST_CONTEXT } from '../test_utils';
import { RequestFlyoutTransactions } from '.';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockUseRequestFlyoutTransactions = jest.fn();
jest.mock('./use_request_flyout_transactions', () => ({
  useRequestFlyoutTransactions: (...args: unknown[]) => mockUseRequestFlyoutTransactions(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_CONTEXT: RequestFlyoutContextValue = {
  deps: TEST_CONTEXT.deps,
  connection: {
    sourceServiceName: 'frontend',
    sourceLabel: 'frontend',
    targetLabel: 'backend',
    dependencies: [],
    targetServiceName: 'backend',
  },
  filters: {
    environment: 'production',
    start: '2024-01-01T00:00:00.000Z',
    end: '2024-01-01T01:00:00.000Z',
    rangeFrom: 'now-1h',
    rangeTo: 'now',
  },
};

const SAMPLE_ITEMS = [
  {
    name: 'GET /api/products',
    transactionType: 'request',
    avgCallLatency: 120_000,
    callCount: 50,
    callRate: 5,
    failedCallRate: 0.01,
    timeConsumedPct: 0.6,
  },
  {
    name: 'POST /api/orders',
    transactionType: 'request',
    avgCallLatency: 200_000,
    callCount: 20,
    callRate: 2,
    failedCallRate: 0.05,
    timeConsumedPct: 0.4,
  },
];

function renderComponent(contextOverrides: Partial<RequestFlyoutContextValue> = {}) {
  const ctx = { ...BASE_CONTEXT, ...contextOverrides };
  return render(
    <RequestFlyoutContextProvider value={ctx}>
      <RequestFlyoutChildProvider
        render={(child) => (
          <div data-test-subj="openChild">
            {child.kind === 'transaction' ? `${child.name}|${child.transactionType}` : child.kind}
          </div>
        )}
      >
        <RequestFlyoutTransactions />
      </RequestFlyoutChildProvider>
    </RequestFlyoutContextProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RequestFlyoutTransactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRequestFlyoutTransactions.mockReturnValue({
      items: SAMPLE_ITEMS,
      isLoading: false,
      hasError: false,
      isSampled: false,
    });
  });

  const nameLink = (name: string) => screen.getByRole('button', { name });

  it('renders a row per transaction group', () => {
    renderComponent();

    expect(screen.getByTestId('requestFlyoutSection-transactions')).toBeInTheDocument();
    expect(screen.getAllByTestId('requestFlyoutTransactionRow')).toHaveLength(2);
    expect(nameLink('GET /api/products')).toBeInTheDocument();
    expect(nameLink('POST /api/orders')).toBeInTheDocument();
  });

  it('shows the calls as a rate', () => {
    renderComponent();

    expect(screen.getByText('5.0 tpm')).toBeInTheDocument();
    expect(screen.getByText('2.0 tpm')).toBeInTheDocument();
  });

  it('shows a loading state while data is being fetched', () => {
    mockUseRequestFlyoutTransactions.mockReturnValue({
      items: [],
      isLoading: true,
      hasError: false,
      isSampled: false,
    });

    renderComponent();

    expect(screen.getByText('Loading transactions…')).toBeInTheDocument();
  });

  it('shows an error when the transactions cannot be loaded', () => {
    mockUseRequestFlyoutTransactions.mockReturnValue({
      items: [],
      isLoading: false,
      hasError: true,
      isSampled: false,
    });

    renderComponent();

    expect(
      screen.getByText('Unable to load the transactions of this connection.')
    ).toBeInTheDocument();
  });

  it('opens the transaction child flyout with name and type when a name is clicked', () => {
    renderComponent();

    fireEvent.click(nameLink('GET /api/products'));

    expect(screen.getByTestId('openChild')).toHaveTextContent('GET /api/products|request');
  });

  it('switches the child flyout when a different name is clicked', () => {
    renderComponent();

    fireEvent.click(nameLink('GET /api/products'));
    fireEvent.click(nameLink('POST /api/orders'));

    expect(screen.getByTestId('openChild')).toHaveTextContent('POST /api/orders|request');
  });

  it('closes the child flyout when the open transaction is clicked again', () => {
    renderComponent();

    fireEvent.click(nameLink('GET /api/products'));
    fireEvent.click(screen.getAllByTestId('requestFlyoutTransactionNameLink-expand')[0]);

    expect(screen.queryByTestId('openChild')).not.toBeInTheDocument();
  });

  it('shows a transaction without a type as plain text, as it cannot be opened', () => {
    mockUseRequestFlyoutTransactions.mockReturnValue({
      items: [{ ...SAMPLE_ITEMS[0], name: 'untyped', transactionType: '' }],
      isLoading: false,
      hasError: false,
      isSampled: false,
    });

    renderComponent();

    expect(screen.getByText('untyped')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'untyped' })).not.toBeInTheDocument();
  });

  it('shows the sample warning when the target has more calls than the cap', () => {
    mockUseRequestFlyoutTransactions.mockReturnValue({
      items: SAMPLE_ITEMS,
      isLoading: false,
      hasError: false,
      isSampled: true,
    });

    renderComponent();

    expect(screen.getByText(/Not all transactions are shown/i)).toBeInTheDocument();
  });

  it('does not show the sample warning by default', () => {
    renderComponent();

    expect(screen.queryByText(/Not all transactions are shown/i)).not.toBeInTheDocument();
  });
});
