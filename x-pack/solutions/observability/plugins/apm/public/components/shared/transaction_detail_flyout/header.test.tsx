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
  afterEach(() => {
    cleanup();
  });

  it('links the transaction name to APM transaction details when href is available', () => {
    mockUseTransactionDetailFlyoutLinks.mockReturnValue({
      loading: false,
      apm: { transactionDetailsHref: '/app/apm/services/checkout/transactions/view?name=GET' },
      discover: { href: undefined, openInDiscoverTab: undefined },
    });

    renderHeader();

    const link = screen.getByTestId('transactionDetailFlyoutTitleLink');
    expect(link).toHaveAttribute('href', '/app/apm/services/checkout/transactions/view?name=GET');
    expect(link).toHaveTextContent('GET /api/orders');
    expect(link).toHaveAttribute('data-ebt-action', 'viewSpan');
    expect(link).toHaveAttribute('data-ebt-element', 'transactionDetailFlyoutTitle');
  });

  it('shows a tooltip describing the title link destination', async () => {
    mockUseTransactionDetailFlyoutLinks.mockReturnValue({
      loading: false,
      apm: { transactionDetailsHref: '/app/apm/services/checkout/transactions/view?name=GET' },
      discover: { href: undefined, openInDiscoverTab: undefined },
    });

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
    mockUseTransactionDetailFlyoutLinks.mockReturnValue({
      loading: false,
      apm: { transactionDetailsHref: undefined },
      discover: { href: undefined, openInDiscoverTab: undefined },
    });

    renderHeader(true);

    expect(screen.getByTestId('transactionDetailFlyoutFiltersPendingSpinner')).toBeInTheDocument();
  });
});
