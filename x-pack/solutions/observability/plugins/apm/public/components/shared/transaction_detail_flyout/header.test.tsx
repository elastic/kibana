/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { TransactionDetailFlyoutHeader } from './header';

const mockUseTransactionDetailFlyoutLinks = jest.fn();
jest.mock('./hooks/use_transaction_detail_flyout_links', () => ({
  useTransactionDetailFlyoutLinks: () => mockUseTransactionDetailFlyoutLinks(),
}));

const mockUseTransactionDetailFlyoutAlertsBadge = jest.fn();
jest.mock('./hooks/use_transaction_detail_flyout_alerts_badge', () => ({
  useTransactionDetailFlyoutAlertsBadge: () => mockUseTransactionDetailFlyoutAlertsBadge(),
}));

const mockUseTransactionDetailFlyoutContext = jest.fn();
jest.mock('./transaction_detail_flyout_context', () => ({
  useTransactionDetailFlyoutContext: () => mockUseTransactionDetailFlyoutContext(),
}));

function renderHeader(isFiltersPending = false) {
  return render(
    <IntlProvider locale="en">
      <TransactionDetailFlyoutHeader
        transactionName="GET /api/orders"
        titleId="title-id"
        isFiltersPending={isFiltersPending}
      />
    </IntlProvider>
  );
}

describe('TransactionDetailFlyoutHeader', () => {
  beforeEach(() => {
    mockUseTransactionDetailFlyoutLinks.mockReturnValue({
      loading: false,
      apm: { transactionDetailsHref: '/app/apm/services/checkout/transactions/view?name=GET' },
      discover: { href: undefined, openInDiscoverTab: undefined },
    });
    mockUseTransactionDetailFlyoutAlertsBadge.mockReturnValue({
      show: false,
      count: 0,
    });
    mockUseTransactionDetailFlyoutContext.mockReturnValue({
      filters: { serviceName: 'checkout' },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('links the transaction name to APM transaction details when href is available', () => {
    renderHeader();

    const link = screen.getByTestId('transactionDetailFlyoutTitleLink');
    expect(link).toHaveAttribute('href', '/app/apm/services/checkout/transactions/view?name=GET');
    expect(link).toHaveTextContent('GET /api/orders');
    expect(link).toHaveAttribute('data-ebt-action', 'viewSpan');
    expect(link).toHaveAttribute('data-ebt-element', 'transactionDetailFlyoutTitle');
  });

  it('shows a tooltip describing the title link destination', async () => {
    renderHeader();

    const link = screen.getByTestId('transactionDetailFlyoutTitleLink');
    const tooltipAnchor = link.closest('.euiToolTipAnchor') ?? link;
    fireEvent.mouseEnter(tooltipAnchor);
    fireEvent.mouseOver(tooltipAnchor);

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveTextContent('Open transaction details');
    });
  });

  it('renders plain text when the APM href is unavailable', () => {
    mockUseTransactionDetailFlyoutLinks.mockReturnValue({
      loading: false,
      apm: { transactionDetailsHref: undefined },
      discover: { href: undefined, openInDiscoverTab: undefined },
    });

    renderHeader();

    expect(screen.getByTestId('transactionDetailFlyoutTitle')).toHaveTextContent('GET /api/orders');
    expect(screen.queryByTestId('transactionDetailFlyoutTitleLink')).not.toBeInTheDocument();
  });

  it('shows a spinner next to the title while filters are pending', () => {
    renderHeader(true);

    expect(screen.getByTestId('transactionDetailFlyoutFiltersPendingSpinner')).toBeInTheDocument();
  });

  it('renders the alerts badge when the alerts hook says to show it', () => {
    mockUseTransactionDetailFlyoutAlertsBadge.mockReturnValue({
      show: true,
      count: 3,
      href: '/app/apm/services/checkout/alerts?kuery=transaction.name:%20%22GET%22',
    });

    renderHeader();

    const badge = screen.getByTestId('transactionDetailFlyoutAlertsBadge');
    expect(badge).toHaveTextContent('3');
    expect(badge).toHaveAttribute(
      'href',
      '/app/apm/services/checkout/alerts?kuery=transaction.name:%20%22GET%22'
    );
    expect(badge).toHaveAttribute('data-ebt-action', 'viewAlerts');
    expect(badge).toHaveAttribute('data-ebt-element', 'transactionDetailFlyoutAlertsBadge');
  });

  it('hides the alerts badge when the alerts hook says not to show it', () => {
    mockUseTransactionDetailFlyoutAlertsBadge.mockReturnValue({
      show: false,
      count: 0,
    });

    renderHeader();

    expect(screen.queryByTestId('transactionDetailFlyoutAlertsBadge')).not.toBeInTheDocument();
  });
});
