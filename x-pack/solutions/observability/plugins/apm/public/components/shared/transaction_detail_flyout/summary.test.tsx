/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
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
    mockUseTransactionDetailFlyoutContext.mockReturnValue({
      deps: {
        core: {
          uiSettings: {
            get: (key: string) => {
              if (key === 'dateFormat:tz') {
                return 'UTC';
              }
              return 'MMM D, YYYY @ HH:mm:ss.SSS';
            },
          },
        },
      },
      filters: FILTERS,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders environment, type, and a combined date range', () => {
    renderSummary();

    const summary = screen.getByTestId('transactionDetailFlyoutSummary');
    expect(summary).not.toHaveTextContent('Transaction ID');
    expect(summary).not.toHaveTextContent('Transaction name');
    expect(summary).not.toHaveTextContent('Start date');
    expect(summary).not.toHaveTextContent('End date');
    expect(summary).toHaveTextContent('Environment');
    expect(summary).toHaveTextContent('production');
    expect(summary).toHaveTextContent('Transaction type');
    expect(summary).toHaveTextContent('request');
    expect(summary).toHaveTextContent('Date range');
    expect(summary).toHaveTextContent('Sep 18, 2026 @ 15:22:22.094 → Sep 18, 2026 @ 15:37:22.094');
  });

  it('formats the date range with the configured Kibana timezone', () => {
    mockUseTransactionDetailFlyoutContext.mockReturnValue({
      deps: {
        core: {
          uiSettings: {
            get: (key: string) => {
              if (key === 'dateFormat:tz') {
                return 'America/New_York';
              }
              return 'MMM D, YYYY @ HH:mm:ss.SSS';
            },
          },
        },
      },
      filters: FILTERS,
    });

    renderSummary();

    expect(screen.getByTestId('transactionDetailFlyoutSummary')).toHaveTextContent(
      'Sep 18, 2026 @ 11:22:22.094 → Sep 18, 2026 @ 11:37:22.094'
    );
  });

  it('updates immediately when service flyout filters change', () => {
    const { rerender } = renderSummary();

    mockUseTransactionDetailFlyoutContext.mockReturnValue({
      deps: {
        core: {
          uiSettings: {
            get: (key: string) => {
              if (key === 'dateFormat:tz') {
                return 'UTC';
              }
              return 'MMM D, YYYY @ HH:mm:ss.SSS';
            },
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

    expect(screen.getByTestId('transactionDetailFlyoutSummary')).toHaveTextContent('staging');
    expect(screen.getByTestId('transactionDetailFlyoutSummary')).toHaveTextContent(
      'Sep 18, 2026 @ 14:37:22.094'
    );
  });
});
