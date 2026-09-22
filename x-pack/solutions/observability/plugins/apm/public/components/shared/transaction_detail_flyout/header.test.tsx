/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { TransactionDetailFlyoutHeader } from './header';

const mockUseTransactionDetailFlyoutLinks = jest.fn();
jest.mock('./hooks/use_transaction_detail_flyout_links', () => ({
  useTransactionDetailFlyoutLinks: () => mockUseTransactionDetailFlyoutLinks(),
}));

function renderHeader() {
  return render(
    <IntlProvider locale="en">
      <TransactionDetailFlyoutHeader transactionName="GET /api/orders" titleId="title-id" />
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
});
