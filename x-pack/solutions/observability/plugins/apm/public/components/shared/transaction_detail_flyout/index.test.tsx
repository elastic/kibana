/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { CoreStart } from '@kbn/core/public';
import { TransactionDetailFlyout } from '.';

vi.mock('@elastic/eui', async () => {
  const original = await vi.importActual('@elastic/eui');
  return {
    ...original,
    EuiPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useGeneratedHtmlId: () => 'transaction-detail-flyout-title-id',
    EuiFlyout: ({ children }: { children: React.ReactNode }) => (
      <section data-test-subj="transactionDetailFlyout">{children}</section>
    ),
  };
});

vi.mock('./latency_distribution', () => {
  const mocked = {
    TransactionDetailFlyoutLatencyDistribution: () => (
      <div data-test-subj="transactionDetailFlyoutSection-latencyDistribution">latency</div>
    ),
  };
  return { ...mocked, default: mocked };
});
vi.mock('./red_metrics', () => {
  const mocked = {
    TransactionDetailFlyoutRedMetrics: () => (
      <div data-test-subj="transactionDetailFlyoutSection-redMetrics">red metrics</div>
    ),
  };
  return { ...mocked, default: mocked };
});
vi.mock('./trace_sample', () => {
  const mocked = {
    TransactionDetailFlyoutTraceSample: async () => {
      const { useTransactionDetailFlyoutContext } = await vi.importActual(
        './transaction_detail_flyout_context'
      );
      const { openFullTraceFlyout } = useTransactionDetailFlyoutContext();
      return (
        <button
          type="button"
          data-test-subj="openFullTraceMock"
          onClick={() => openFullTraceFlyout({ traceId: 'trace-1', contextSpanIds: ['span-1'] })}
        >
          open full trace
        </button>
      );
    },
  };
  return { ...mocked, default: mocked };
});
vi.mock('./summary', () => {
  const mocked = {
    TransactionDetailFlyoutSummary: () => (
      <div data-test-subj="transactionDetailFlyoutSummary">summary</div>
    ),
  };
  return { ...mocked, default: mocked };
});
vi.mock('./footer', () => {
  const mocked = {
    TransactionDetailFlyoutFooter: () => (
      <div data-test-subj="transactionDetailFlyoutFooter">footer</div>
    ),
  };
  return { ...mocked, default: mocked };
});

const mockTraceWaterfallFlyout = vi.fn((_props: unknown) => (
  <div data-test-subj="traceWaterfallFlyoutMock" />
));
vi.mock('../../app/transaction_details/waterfall_with_summary/trace_waterfall_flyout', () => {
  const mocked = {
    TraceWaterfallFlyout: (props: unknown) => mockTraceWaterfallFlyout(props),
  };
  return { ...mocked, default: mocked };
});

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
  start: '2026-08-20T10:00:00.000Z',
  end: '2026-08-21T10:43:35.610Z',
};

const BASE_PROPS = {
  deps: DEPS,
  filters: FILTERS,
  onClose: vi.fn(),
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
    expect(screen.getByTestId('openFullTraceMock')).toBeInTheDocument();
    expect(screen.getByTestId('transactionDetailFlyoutFooter')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<TransactionDetailFlyout {...BASE_PROPS} isOpen={false} />);

    expect(screen.queryByTestId('transactionDetailFlyout')).not.toBeInTheDocument();
  });

  it('shows a stale-filters callout when isFiltersStale is true', () => {
    render(<TransactionDetailFlyout {...BASE_PROPS} isFiltersStale />);

    expect(screen.getByTestId('transactionDetailFlyoutStaleFiltersCallout')).toHaveTextContent(
      "This transaction isn't available with the current filters. Showing previous data."
    );
  });

  it('hides the stale-filters callout when isFiltersStale is false', () => {
    render(<TransactionDetailFlyout {...BASE_PROPS} />);

    expect(
      screen.queryByTestId('transactionDetailFlyoutStaleFiltersCallout')
    ).not.toBeInTheDocument();
  });

  it('shows a spinner next to the title while filters are pending', () => {
    render(<TransactionDetailFlyout {...BASE_PROPS} isFiltersPending />);

    expect(screen.getByTestId('transactionDetailFlyoutFiltersPendingSpinner')).toBeInTheDocument();
  });

  it('opens the full-trace waterfall with absolute start/end and relative locator ranges', () => {
    render(
      <TransactionDetailFlyout
        {...BASE_PROPS}
        filters={{
          ...FILTERS,
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          start: '2026-08-20T10:00:00.000Z',
          end: '2026-08-21T10:43:35.610Z',
        }}
      />
    );

    fireEvent.click(screen.getByTestId('openFullTraceMock'));

    expect(mockTraceWaterfallFlyout).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: 'trace-1',
        rangeFrom: 'now-15m',
        rangeTo: 'now',
        start: '2026-08-20T10:00:00.000Z',
        end: '2026-08-21T10:43:35.610Z',
        contextSpanIds: ['span-1'],
      })
    );
  });
});
