/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { TransactionGroup } from '@kbn/apm-ui-shared';
import { RequestFlyoutContextProvider } from '../request_flyout_context';
import type { RequestFlyoutContextValue } from '../request_flyout_context';
import { RequestFlyoutTransactions } from '.';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockUseRequestFlyoutTransactions = jest.fn();
jest.mock('./use_request_flyout_transactions', () => ({
  useRequestFlyoutTransactions: (...args: unknown[]) => mockUseRequestFlyoutTransactions(...args),
}));

// Mock TransactionsTable so we can control what it renders and intercept
// columnInteractions without pulling in the full @kbn/apm-ui-shared bundle.
const mockTransactionsTable = jest.fn();
jest.mock('@kbn/apm-ui-shared', () => ({
  TransactionsTable: (props: {
    items: TransactionGroup[];
    isLoading: boolean;
    maxCountExceeded: boolean;
    columnInteractions?: {
      name?: {
        onClick?: (item: TransactionGroup) => void;
        isExpanded?: (item: TransactionGroup) => boolean;
      };
    };
  }) => {
    mockTransactionsTable(props);
    if (props.isLoading) {
      return <div data-test-subj="transactionsTableLoading">Loading…</div>;
    }
    return (
      <div data-test-subj="transactionsTable">
        {props.maxCountExceeded && (
          <div data-test-subj="maxTransactionsBanner">Max transactions reached</div>
        )}
        {props.items.map((item) => (
          <button
            key={`${item.name}-${item.transactionType}`}
            data-test-subj={`transactionRow-${item.name}`}
            data-expanded={String(props.columnInteractions?.name?.isExpanded?.(item) ?? false)}
            onClick={() => props.columnInteractions?.name?.onClick?.(item)}
          >
            {item.name}
          </button>
        ))}
      </div>
    );
  },
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
    environment: 'ENVIRONMENT_ALL',
    setEnvironment: jest.fn(),
    start: '2024-01-01T00:00:00.000Z',
    end: '2024-01-01T01:00:00.000Z',
    rangeFrom: 'now-1h',
    rangeTo: 'now',
    setRange: jest.fn(),
  },
  refreshToken: 0,
  onRefresh: jest.fn(),
};

const SAMPLE_TRANSACTIONS: TransactionGroup[] = [
  {
    name: 'GET /api/products',
    transactionType: 'request',
    latency: { value: 120 },
    throughput: { value: 5 },
    errorRate: { value: 0.01 },
  },
  {
    name: 'POST /api/orders',
    transactionType: 'request',
    latency: { value: 200 },
    throughput: { value: 2 },
    errorRate: { value: 0.05 },
  },
];

function renderComponent(contextOverrides: Partial<RequestFlyoutContextValue> = {}) {
  const ctx = { ...BASE_CONTEXT, ...contextOverrides };
  return render(
    <RequestFlyoutContextProvider value={ctx}>
      <RequestFlyoutTransactions latencyAggregationType="avg" />
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
      items: SAMPLE_TRANSACTIONS,
      isLoading: false,
      isMaxTransactionsReached: false,
    });
  });

  it('shows loading state while data is being fetched', () => {
    mockUseRequestFlyoutTransactions.mockReturnValue({
      items: [],
      isLoading: true,
      isMaxTransactionsReached: false,
    });

    renderComponent();

    expect(screen.getByTestId('transactionsTableLoading')).toBeInTheDocument();
  });

  it('renders transaction rows when data has loaded', () => {
    renderComponent();

    expect(screen.getByTestId('requestFlyoutSection-transactions')).toBeInTheDocument();
    expect(screen.getByTestId('transactionRow-GET /api/products')).toBeInTheDocument();
    expect(screen.getByTestId('transactionRow-POST /api/orders')).toBeInTheDocument();
  });

  it('opens TransactionDetailFlyout when a transaction row is clicked', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('transactionRow-GET /api/products'));

    const flyout = screen.getByTestId('transactionDetailFlyout');
    expect(flyout).toBeInTheDocument();
    expect(screen.getByTestId('transactionDetailFlyoutName')).toHaveTextContent(
      'GET /api/products'
    );
  });

  it('closes TransactionDetailFlyout when the same row is clicked again (toggle)', () => {
    renderComponent();

    const row = screen.getByTestId('transactionRow-GET /api/products');

    // First click — opens
    fireEvent.click(row);
    expect(screen.getByTestId('transactionDetailFlyout')).toBeInTheDocument();

    // Second click on the same row — closes
    fireEvent.click(row);
    expect(screen.queryByTestId('transactionDetailFlyout')).not.toBeInTheDocument();
  });

  it('switches selected transaction when a different row is clicked', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('transactionRow-GET /api/products'));
    expect(screen.getByTestId('transactionDetailFlyoutName')).toHaveTextContent(
      'GET /api/products'
    );

    fireEvent.click(screen.getByTestId('transactionRow-POST /api/orders'));
    expect(screen.getByTestId('transactionDetailFlyoutName')).toHaveTextContent('POST /api/orders');
  });

  it('closes the flyout when the flyout close button is clicked', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('transactionRow-GET /api/products'));
    expect(screen.getByTestId('transactionDetailFlyout')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('transactionDetailFlyoutClose'));
    expect(screen.queryByTestId('transactionDetailFlyout')).not.toBeInTheDocument();
  });

  it('shows the max transactions banner when isMaxTransactionsReached is true', () => {
    mockUseRequestFlyoutTransactions.mockReturnValue({
      items: SAMPLE_TRANSACTIONS,
      isLoading: false,
      isMaxTransactionsReached: true,
    });

    renderComponent();

    expect(screen.getByTestId('maxTransactionsBanner')).toBeInTheDocument();
  });

  it('does not show the max transactions banner when isMaxTransactionsReached is false', () => {
    renderComponent();

    expect(screen.queryByTestId('maxTransactionsBanner')).not.toBeInTheDocument();
  });

  it('does not render TransactionDetailFlyout when no transaction is selected', () => {
    renderComponent();

    expect(screen.queryByTestId('transactionDetailFlyout')).not.toBeInTheDocument();
  });
});
