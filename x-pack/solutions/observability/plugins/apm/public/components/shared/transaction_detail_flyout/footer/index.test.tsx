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

function makeLinks(
  overrides: {
    discoverHref?: string;
    openInDiscoverTab?: () => void;
    transactionDetailsHref?: string;
    loading?: boolean;
  } = {}
) {
  const {
    discoverHref = '/app/discover/traces',
    openInDiscoverTab,
    transactionDetailsHref = '/app/apm/services/checkout/transactions/view',
    loading = false,
  } = overrides;

  return {
    loading,
    apm: { transactionDetailsHref },
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

  it('enables the actions button and renders Discover and transaction details actions', () => {
    renderFooter();

    const button = screen.getByTestId('transactionDetailFlyoutActionsButton');
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute('data-ebt-action', 'openActions');
    expect(button).toHaveAttribute('data-ebt-element', 'transactionDetailFlyoutActionsMenu');

    openActionsMenu();

    const discoverAction = screen.getByTestId(
      'transactionDetailFlyoutActionsMenuItem-openTracesInDiscover'
    );
    expect(discoverAction).toHaveAttribute('href', '/app/discover/traces');
    expect(discoverAction).toHaveTextContent('Open traces in Discover');
    expect(discoverAction).toHaveAttribute('data-ebt-action', 'openInDiscover');
    expect(discoverAction).toHaveAttribute(
      'data-ebt-element',
      'transactionDetailFlyoutActionsMenu'
    );
    expect(discoverAction).toHaveAttribute('data-ebt-detail', 'traces');

    const detailsAction = screen.getByTestId(
      'transactionDetailFlyoutActionsMenuItem-openTransactionDetails'
    );
    expect(detailsAction).toHaveAttribute('href', '/app/apm/services/checkout/transactions/view');
    expect(detailsAction).toHaveTextContent('Open transaction details');
    expect(detailsAction).toHaveAttribute('data-ebt-action', 'viewSpan');
    expect(detailsAction).toHaveAttribute('data-ebt-element', 'transactionDetailFlyoutActionsMenu');
    expect(detailsAction).toHaveAttribute('data-ebt-detail', 'transactionDetails');
  });

  it('keeps the actions button enabled while indices load if transaction details is available', () => {
    mockUseTransactionDetailFlyoutLinks.mockReturnValue({
      loading: true,
      apm: { transactionDetailsHref: '/app/apm/services/checkout/transactions/view' },
      discover: { href: undefined, openInDiscoverTab: undefined },
    });

    renderFooter();

    expect(screen.getByTestId('transactionDetailFlyoutActionsButton')).not.toBeDisabled();

    openActionsMenu();
    expect(
      screen.getByTestId('transactionDetailFlyoutActionsMenuItem-openTransactionDetails')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('transactionDetailFlyoutActionsMenuItem-openTracesInDiscover')
    ).not.toBeInTheDocument();
  });

  it('shows loading and disables the actions button when no actions are available yet', () => {
    mockUseTransactionDetailFlyoutLinks.mockReturnValue({
      loading: true,
      apm: { transactionDetailsHref: undefined },
      discover: { href: undefined, openInDiscoverTab: undefined },
    });

    renderFooter();

    expect(screen.getByTestId('transactionDetailFlyoutActionsButton')).toBeDisabled();
  });

  it('disables the actions button when no actions are available', () => {
    mockUseTransactionDetailFlyoutLinks.mockReturnValue({
      loading: false,
      apm: { transactionDetailsHref: undefined },
      discover: { href: undefined, openInDiscoverTab: undefined },
    });

    renderFooter();

    expect(screen.getByTestId('transactionDetailFlyoutActionsButton')).toBeDisabled();
  });

  it('omits Discover when unavailable and still shows transaction details', () => {
    mockUseTransactionDetailFlyoutLinks.mockReturnValue({
      loading: false,
      apm: { transactionDetailsHref: '/app/apm/services/checkout/transactions/view' },
      discover: { href: undefined, openInDiscoverTab: undefined },
    });

    renderFooter();
    openActionsMenu();

    expect(
      screen.queryByTestId('transactionDetailFlyoutActionsMenuItem-openTracesInDiscover')
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('transactionDetailFlyoutActionsMenuItem-openTransactionDetails')
    ).toBeInTheDocument();
  });

  it('uses the Discover tab label and onClick when openInDiscoverTab is provided', () => {
    const openInDiscoverTab = jest.fn();
    mockUseTransactionDetailFlyoutLinks.mockReturnValue(makeLinks({ openInDiscoverTab }));

    renderFooter();
    openActionsMenu();

    const discoverAction = screen.getByTestId(
      'transactionDetailFlyoutActionsMenuItem-openTracesInDiscover'
    );
    expect(discoverAction).toHaveTextContent('Open traces in a Discover tab');

    fireEvent.click(discoverAction);
    expect(openInDiscoverTab).toHaveBeenCalledTimes(1);
  });
});
