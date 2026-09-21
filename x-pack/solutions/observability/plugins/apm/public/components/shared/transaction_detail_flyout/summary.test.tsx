/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { TransactionDetailFlyoutSummary } from './summary';

const mockUseTransactionDetailFlyoutContext = jest.fn();
jest.mock('./transaction_detail_flyout_context', () => ({
  useTransactionDetailFlyoutContext: () => mockUseTransactionDetailFlyoutContext(),
}));

const FILTERS = {
  serviceName: 'checkout',
  transactionName: 'GET /api/orders',
  transactionType: 'request',
  environment: 'production',
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  start: '2026-09-18T15:22:22.094Z',
  end: '2026-09-18T15:37:22.094Z',
};

function renderSummary() {
  return render(
    <IntlProvider locale="en">
      <TransactionDetailFlyoutSummary />
    </IntlProvider>
  );
}

describe('TransactionDetailFlyoutSummary', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUseTransactionDetailFlyoutContext.mockReturnValue({
      deps: {
        core: {
          uiSettings: {
            get: () => 'MMM D, YYYY @ HH:mm:ss.SSS',
          },
        },
      },
      filters: FILTERS,
    });
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('renders environment, type, and a combined date range', () => {
    renderSummary();

    const summary = screen.getByTestId('transactionDetailFlyoutSummary');
    expect(summary).toHaveAttribute('data-loading', 'false');
    expect(summary).not.toHaveTextContent('Transaction ID');
    expect(summary).not.toHaveTextContent('Transaction name');
    expect(summary).not.toHaveTextContent('Start date');
    expect(summary).not.toHaveTextContent('End date');
    expect(summary).toHaveTextContent('Environment');
    expect(summary).toHaveTextContent('production');
    expect(summary).toHaveTextContent('Transaction type');
    expect(summary).toHaveTextContent('request');
    expect(summary).toHaveTextContent('Date range');
    expect(summary).toHaveTextContent(
      /Sep 18, 2026 @ \d{2}:22:22\.094 → Sep 18, 2026 @ \d{2}:37:22\.094/
    );
  });

  it('shows a loading state when service flyout filters change', () => {
    const { rerender } = renderSummary();

    mockUseTransactionDetailFlyoutContext.mockReturnValue({
      deps: {
        core: {
          uiSettings: {
            get: () => 'MMM D, YYYY @ HH:mm:ss.SSS',
          },
        },
      },
      filters: {
        ...FILTERS,
        environment: 'staging',
        rangeFrom: 'now-1h',
        rangeTo: 'now',
        start: '2026-09-18T14:37:22.094Z',
        end: '2026-09-18T15:37:22.094Z',
      },
    });

    rerender(
      <IntlProvider locale="en">
        <TransactionDetailFlyoutSummary />
      </IntlProvider>
    );

    expect(screen.getByTestId('transactionDetailFlyoutSummary')).toHaveAttribute(
      'data-loading',
      'true'
    );

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(screen.getByTestId('transactionDetailFlyoutSummary')).toHaveAttribute(
      'data-loading',
      'false'
    );
    expect(screen.getByTestId('transactionDetailFlyoutSummary')).toHaveTextContent('staging');
    expect(screen.getByTestId('transactionDetailFlyoutSummary')).toHaveTextContent(
      /Sep 18, 2026 @ \d{2}:37:22\.094/
    );
  });
});
