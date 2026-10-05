/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { CoreStart } from '@kbn/core/public';
import { TransactionDetailFlyout, TRANSACTION_DETAIL_FLYOUT_HISTORY_KEY } from '.';

const mockFlyoutTemplateProps = jest.fn();

// A lightweight stand-in for the template that renders the zones' children and records the root
// props, so the container's wiring can be asserted in isolation.
jest.mock('@kbn/flyout-template', () => {
  const passthrough = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  const FlyoutTemplate = ({ children, ...props }: { children: React.ReactNode }) => {
    mockFlyoutTemplateProps(props);
    return <section data-test-subj="transactionDetailFlyout">{children}</section>;
  };
  FlyoutTemplate.Header = ({
    title,
    children,
  }: {
    title: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <header>
      {title}
      {children}
    </header>
  );
  FlyoutTemplate.Body = Object.assign(passthrough, {
    Callout: ({ title, ...rest }: { title: React.ReactNode }) => <div {...rest}>{title}</div>,
  });
  FlyoutTemplate.Footer = Object.assign(passthrough, {
    PrimaryActionMenu: () => <div data-test-subj="transactionDetailFlyoutFooter">footer</div>,
  });
  return { __esModule: true, FlyoutTemplate };
});

jest.mock('./header', () => ({
  useTransactionDetailFlyoutHeader: ({ isFiltersPending }: { isFiltersPending?: boolean }) => {
    const { useTransactionDetailFlyoutContext } = jest.requireActual(
      './transaction_detail_flyout_context'
    );
    const {
      filters: { transactionName },
    } = useTransactionDetailFlyoutContext();
    return {
      titleNode: (
        <span data-test-subj="transactionDetailFlyoutTitle">
          {transactionName}
          {isFiltersPending ? (
            <span data-test-subj="transactionDetailFlyoutFiltersPendingSpinner" />
          ) : null}
        </span>
      ),
      metaBlocks: [],
      badges: [],
    };
  },
}));
jest.mock('./footer', () => ({
  useTransactionDetailFlyoutFooterMenu: () => ({
    panels: [{ id: 0, items: [] }],
    isLoading: false,
    hasActions: false,
  }),
}));

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
  TransactionDetailFlyoutTraceSample: () => {
    const { useTransactionDetailFlyoutContext } = jest.requireActual(
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
}));

const mockTraceWaterfallFlyout = jest.fn((_props: unknown) => (
  <div data-test-subj="traceWaterfallFlyoutMock" />
));
jest.mock('../../app/transaction_details/waterfall_with_summary/trace_waterfall_flyout', () => ({
  TraceWaterfallFlyout: (props: unknown) => mockTraceWaterfallFlyout(props),
}));

const DEPS = {
  core: {
    application: {
      capabilities: {
        apm: {},
      },
    },
  } as unknown as CoreStart,
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
  onClose: jest.fn(),
};

describe('TransactionDetailFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the transaction name in the header and flyout content', () => {
    render(<TransactionDetailFlyout {...BASE_PROPS} />);

    expect(screen.getByTestId('transactionDetailFlyout')).toBeInTheDocument();
    expect(mockFlyoutTemplateProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        'data-test-subj': 'transactionDetailFlyout',
        onClose: BASE_PROPS.onClose,
        ownFocus: false,
        size: 'fill',
        session: 'inherit',
        historyKey: TRANSACTION_DETAIL_FLYOUT_HISTORY_KEY,
      })
    );
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
