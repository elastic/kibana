/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { CoreStart } from '@kbn/core/public';
import { TransactionDetailFlyout } from '.';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useGeneratedHtmlId: () => 'transaction-detail-flyout-title-id',
    EuiFlyout: ({ children }: { children: React.ReactNode }) => (
      <section data-test-subj="transactionDetailFlyout">{children}</section>
    ),
  };
});

jest.mock('./latency_distribution', () => ({
  TransactionDetailFlyoutLatencyDistribution: () => (
    <div data-test-subj="transactionDetailFlyoutSection-latencyDistribution">latency</div>
  ),
}));
jest.mock('./red_metrics', () => ({
  TransactionDetailFlyoutRedMetrics: () => (
    <div data-test-subj="transactionDetailFlyoutSection-redMetrics">red metrics</div>
  ),
}));
jest.mock('./trace_sample', () => ({
  TransactionDetailFlyoutTraceSample: () => (
    <div data-test-subj="transactionDetailFlyoutSection-traceSample">trace sample</div>
  ),
}));
jest.mock('./footer', () => ({
  TransactionDetailFlyoutFooter: () => (
    <div data-test-subj="transactionDetailFlyoutFooter">footer</div>
  ),
}));

const DEPS = {
  core: {} as CoreStart,
};

const FILTERS = {
  serviceName: 'checkout',
  transactionName: 'oteldemo.CheckoutService/PlaceOrder',
  transactionType: 'request',
  environment: 'oteldemo',
  rangeFrom: '2026-08-20T10:00:00.000Z',
  rangeTo: '2026-08-21T10:43:35.610Z',
};

const BASE_PROPS = {
  deps: DEPS,
  filters: FILTERS,
  onClose: jest.fn(),
};

describe('TransactionDetailFlyout', () => {
  it('renders the transaction name in the header and flyout content', () => {
    render(<TransactionDetailFlyout {...BASE_PROPS} />);

    expect(screen.getByTestId('transactionDetailFlyout')).toBeInTheDocument();
    expect(screen.getByTestId('transactionDetailFlyoutTitle')).toHaveTextContent(
      FILTERS.transactionName
    );
    expect(screen.getByTestId('transactionDetailFlyoutSection-redMetrics')).toBeInTheDocument();
    expect(
      screen.getByTestId('transactionDetailFlyoutSection-latencyDistribution')
    ).toBeInTheDocument();
    expect(screen.getByTestId('transactionDetailFlyoutFooter')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<TransactionDetailFlyout {...BASE_PROPS} isOpen={false} />);

    expect(screen.queryByTestId('transactionDetailFlyout')).not.toBeInTheDocument();
  });
});
