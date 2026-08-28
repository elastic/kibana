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

function openActionsMenu() {
  fireEvent.click(screen.getByTestId('transactionDetailFlyoutActionsButton'));
}

describe('TransactionDetailFlyoutFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionDetailFlyoutLinks.mockReturnValue(makeLinks());
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the discover action when href resolves', () => {
    renderFooter();

    expect(screen.getByTestId('transactionDetailFlyoutActionsButton')).not.toBeDisabled();
    openActionsMenu();

    expect(
      screen.getByTestId('transactionDetailFlyoutActionsMenuItem-openTracesInDiscover')
    ).toHaveAttribute('href', '/app/discover/traces');
  });

  it('disables the actions button while links are loading', () => {
    mockUseTransactionDetailFlyoutLinks.mockReturnValue(makeLinks({ loading: true }));

    renderFooter();

    expect(screen.getByTestId('transactionDetailFlyoutActionsButton')).toBeDisabled();
  });

  it('disables the actions button when no actions are available', () => {
    mockUseTransactionDetailFlyoutLinks.mockReturnValue({
      loading: false,
      discover: { href: undefined, openInDiscoverTab: undefined },
    });

    renderFooter();

    expect(screen.getByTestId('transactionDetailFlyoutActionsButton')).toBeDisabled();
  });

  it('uses the Discover tab action label when openInDiscoverTab is provided', () => {
    mockUseTransactionDetailFlyoutLinks.mockReturnValue(
      makeLinks({ openInDiscoverTab: jest.fn() })
    );

    renderFooter();
    openActionsMenu();

    expect(
      screen.getByTestId('transactionDetailFlyoutActionsMenuItem-openTracesInDiscover')
    ).toHaveTextContent('Open traces in a Discover tab');
  });
});
