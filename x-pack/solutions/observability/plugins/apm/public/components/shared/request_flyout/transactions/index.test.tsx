/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { RequestFlyoutContextProvider } from '../request_flyout_context';
import type { RequestFlyoutContextValue } from '../request_flyout_context';
import { RequestFlyoutAffectedEndpoints } from '.';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockUseRequestFlyoutTransactions = jest.fn();
jest.mock('./use_request_flyout_transactions', () => ({
  useRequestFlyoutTransactions: (...args: unknown[]) => mockUseRequestFlyoutTransactions(...args),
}));

// TransactionDetailFlyout — lightweight stub.
jest.mock('../../transaction_detail_flyout', () => ({
  TransactionDetailFlyout: ({
    filters,
    onClose,
  }: {
    filters: { transactionName: string };
    onClose: () => void;
  }) => (
    <div data-test-subj="transactionDetailFlyout">
      <span data-test-subj="transactionDetailFlyoutName">{filters.transactionName}</span>
      <button data-test-subj="transactionDetailFlyoutClose" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_CONTEXT: RequestFlyoutContextValue = {
  deps: { core: {} as any },
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
    isSampled: false,
  },
  {
    name: 'POST /api/orders',
    transactionType: 'request',
    avgCallLatency: 200_000,
    callCount: 20,
    callRate: 2,
    failedCallRate: 0.05,
    timeConsumedPct: 0.4,
    isSampled: false,
  },
];

function renderComponent(contextOverrides: Partial<RequestFlyoutContextValue> = {}) {
  const ctx = { ...BASE_CONTEXT, ...contextOverrides };
  return render(
    <RequestFlyoutContextProvider value={ctx}>
      <RequestFlyoutAffectedEndpoints />
    </RequestFlyoutContextProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RequestFlyoutAffectedEndpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRequestFlyoutTransactions.mockReturnValue({
      items: SAMPLE_ITEMS,
      isLoading: false,
      isMaxTransactionsReached: false,
    });
  });

  it('renders transaction rows when data has loaded', () => {
    renderComponent();

    expect(screen.getByTestId('requestFlyoutSection-affectedEndpoints')).toBeInTheDocument();
    expect(
      screen.getByTestId('requestFlyoutTransactionNameLink-GET /api/products')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('requestFlyoutTransactionNameLink-POST /api/orders')
    ).toBeInTheDocument();
  });

  it('shows a loading state while data is being fetched', () => {
    mockUseRequestFlyoutTransactions.mockReturnValue({
      items: [],
      isLoading: true,
      isMaxTransactionsReached: false,
    });

    renderComponent();
    expect(screen.getByText('Loading transactions…')).toBeInTheDocument();
  });

  it('opens TransactionDetailFlyout when a transaction name link is clicked', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('requestFlyoutTransactionNameLink-GET /api/products'));

    const flyout = screen.getByTestId('transactionDetailFlyout');
    expect(flyout).toBeInTheDocument();
    expect(screen.getByTestId('transactionDetailFlyoutName')).toHaveTextContent(
      'GET /api/products'
    );
  });

  it('closes TransactionDetailFlyout when the same row is clicked again (toggle)', () => {
    renderComponent();

    const link = screen.getByTestId('requestFlyoutTransactionNameLink-GET /api/products');

    fireEvent.click(link);
    expect(screen.getByTestId('transactionDetailFlyout')).toBeInTheDocument();

    fireEvent.click(link);
    expect(screen.queryByTestId('transactionDetailFlyout')).not.toBeInTheDocument();
  });

  it('switches selected transaction when a different name link is clicked', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('requestFlyoutTransactionNameLink-GET /api/products'));
    expect(screen.getByTestId('transactionDetailFlyoutName')).toHaveTextContent(
      'GET /api/products'
    );

    fireEvent.click(screen.getByTestId('requestFlyoutTransactionNameLink-POST /api/orders'));
    expect(screen.getByTestId('transactionDetailFlyoutName')).toHaveTextContent('POST /api/orders');
  });

  it('closes the detail flyout when the flyout close button is clicked', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('requestFlyoutTransactionNameLink-GET /api/products'));
    expect(screen.getByTestId('transactionDetailFlyout')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('transactionDetailFlyoutClose'));
    expect(screen.queryByTestId('transactionDetailFlyout')).not.toBeInTheDocument();
  });

  it('shows the max-transactions warning when isMaxTransactionsReached is true', () => {
    mockUseRequestFlyoutTransactions.mockReturnValue({
      items: SAMPLE_ITEMS,
      isLoading: false,
      isMaxTransactionsReached: true,
    });

    renderComponent();

    expect(screen.getByText(/Not all transactions are shown/i)).toBeInTheDocument();
  });

  it('does not show the max-transactions warning by default', () => {
    renderComponent();
    expect(screen.queryByText(/Not all transactions are shown/i)).not.toBeInTheDocument();
  });

  it('does not render TransactionDetailFlyout when no transaction is selected', () => {
    renderComponent();
    expect(screen.queryByTestId('transactionDetailFlyout')).not.toBeInTheDocument();
  });
});
