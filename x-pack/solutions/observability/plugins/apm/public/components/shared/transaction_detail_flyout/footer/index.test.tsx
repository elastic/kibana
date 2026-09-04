/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { TransactionDetailFlyoutFooter } from '.';

const mockUseTransactionDetailFlyoutLinks = jest.fn();
jest.mock('../hooks/use_transaction_detail_flyout_links', () => ({
  useTransactionDetailFlyoutLinks: () => mockUseTransactionDetailFlyoutLinks(),
}));

function makeLinks({
  discoverHref = '/app/discover/traces',
  openInDiscoverTab = undefined as (() => void) | undefined,
  loading = false,
} = {}) {
  return {
    loading,
    apm: { transactionDetailsHref: '/app/apm/services/checkout/transactions/view' },
    discover: { href: discoverHref, openInDiscoverTab },
  };
}

function renderFooter() {
  return render(
    <IntlProvider locale="en">
      <TransactionDetailFlyoutFooter />
    </IntlProvider>
  );
}

describe('TransactionDetailFlyoutFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionDetailFlyoutLinks.mockReturnValue(makeLinks());
  });

  afterEach(() => {
    cleanup();
  });

  it('renders a direct Discover button when href resolves', () => {
    renderFooter();

    const button = screen.getByTestId('transactionDetailFlyoutOpenInDiscoverButton');
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute('href', '/app/discover/traces');
    expect(button).toHaveTextContent('Open traces in Discover');
  });

  it('disables the Discover button while links are loading', () => {
    mockUseTransactionDetailFlyoutLinks.mockReturnValue(makeLinks({ loading: true }));

    renderFooter();

    expect(screen.getByTestId('transactionDetailFlyoutOpenInDiscoverButton')).toBeDisabled();
  });

  it('disables the Discover button when no discover action is available', () => {
    mockUseTransactionDetailFlyoutLinks.mockReturnValue({
      loading: false,
      apm: { transactionDetailsHref: undefined },
      discover: { href: undefined, openInDiscoverTab: undefined },
    });

    renderFooter();

    expect(screen.getByTestId('transactionDetailFlyoutOpenInDiscoverButton')).toBeDisabled();
  });

  it('uses the Discover tab label and onClick when openInDiscoverTab is provided', () => {
    const openInDiscoverTab = jest.fn();
    mockUseTransactionDetailFlyoutLinks.mockReturnValue(makeLinks({ openInDiscoverTab }));

    renderFooter();

    const button = screen.getByTestId('transactionDetailFlyoutOpenInDiscoverButton');
    expect(button).toHaveTextContent('Open traces in a Discover tab');
    expect(button).not.toHaveAttribute('href');

    fireEvent.click(button);
    expect(openInDiscoverTab).toHaveBeenCalledTimes(1);
  });
});
