/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { CoreStart } from '@kbn/core/public';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/common/config_schema';
import { TransactionDetailFlyout, TRANSACTION_DETAIL_FLYOUT_HISTORY_KEY } from '.';
import type { TransactionDetailFlyoutFooterMenu } from './footer';

const mockUseResolvedApmIndices = jest.fn((_args: unknown): APMIndices | null | undefined => null);
jest.mock('../../../hooks/use_apm_indices', () => ({
  useResolvedApmIndices: (args: unknown) => mockUseResolvedApmIndices(args),
}));

const mockFlyoutTemplateProps = jest.fn();
const mockPrimaryActionMenuProps = jest.fn();

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
    isLoading,
    children,
  }: {
    title: React.ReactNode;
    isLoading?: boolean;
    children?: React.ReactNode;
  }) => (
    <header>
      {title}
      {isLoading ? <span data-test-subj="flyoutHeaderTitleLoading" /> : null}
      {children}
    </header>
  );
  FlyoutTemplate.Body = Object.assign(passthrough, {
    Callout: ({ title, ...rest }: { title: React.ReactNode }) => <div {...rest}>{title}</div>,
  });
  FlyoutTemplate.Footer = Object.assign(passthrough, {
    PrimaryActionMenu: (props: Record<string, unknown>) => {
      mockPrimaryActionMenuProps(props);
      return <div data-test-subj="transactionDetailFlyoutFooter">footer</div>;
    },
  });
  return { __esModule: true, FlyoutTemplate };
});

jest.mock('./header', () => ({
  useTransactionDetailFlyoutHeader: () => {
    const { useTransactionDetailFlyoutContext } = jest.requireActual(
      './transaction_detail_flyout_context'
    );
    const {
      filters: { transactionName },
    } = useTransactionDetailFlyoutContext();
    return {
      titleNode: <span data-test-subj="transactionDetailFlyoutTitle">{transactionName}</span>,
      titleText: transactionName,
      metaBlocks: [],
      badges: [],
    };
  },
}));
const EMPTY_FOOTER_MENU: TransactionDetailFlyoutFooterMenu = {
  panels: [{ id: 0, items: [] }],
  isLoading: false,
  hasActions: false,
};
const mockUseTransactionDetailFlyoutFooterMenu = jest.fn(
  (): TransactionDetailFlyoutFooterMenu => EMPTY_FOOTER_MENU
);
jest.mock('./footer', () => ({
  useTransactionDetailFlyoutFooterMenu: () => mockUseTransactionDetailFlyoutFooterMenu(),
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

const http = { fetch: jest.fn() };

const DEPS = {
  core: {
    http,
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

const PARENT_INDICES = {
  transaction: 'traces-parent*',
  span: 'traces-parent*',
  error: 'logs-parent*',
  metric: 'metrics-parent*',
  onboarding: 'apm-*',
  sourcemap: 'apm-*',
} as APMIndices;

describe('TransactionDetailFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseResolvedApmIndices.mockReturnValue(null);
    mockUseTransactionDetailFlyoutFooterMenu.mockReturnValue(EMPTY_FOOTER_MENU);
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

    expect(screen.getByTestId('flyoutHeaderTitleLoading')).toBeInTheDocument();
  });

  it('passes the footer menu state and open-actions telemetry to the actions button', () => {
    const panels = [{ id: 0, items: [{ name: 'Open transaction details', href: '/details' }] }];
    mockUseTransactionDetailFlyoutFooterMenu.mockReturnValue({
      panels,
      isLoading: true,
      hasActions: true,
    });

    render(<TransactionDetailFlyout {...BASE_PROPS} />);

    expect(mockPrimaryActionMenuProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        label: 'Actions',
        panels,
        'data-test-subj': 'transactionDetailFlyoutActionsButton',
        isLoading: true,
        isDisabled: false,
        'data-ebt-action': 'openActions',
        'data-ebt-element': 'transactionDetailFlyoutActionsMenu',
      })
    );
  });

  it('disables the actions button when no actions are available', () => {
    render(<TransactionDetailFlyout {...BASE_PROPS} />);

    expect(mockPrimaryActionMenuProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ isDisabled: true, isLoading: false })
    );
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
        indicesSource: { indices: null },
      })
    );
  });

  it('fetches indices when opened without a parent source', () => {
    render(<TransactionDetailFlyout {...BASE_PROPS} />);

    expect(mockUseResolvedApmIndices).toHaveBeenCalledWith({
      http,
      indicesSource: undefined,
    });
  });

  it('reuses parent indices and passes that same source into the full-trace flyout', () => {
    mockUseResolvedApmIndices.mockReturnValue(PARENT_INDICES);

    render(<TransactionDetailFlyout {...BASE_PROPS} indicesSource={{ indices: PARENT_INDICES }} />);

    expect(mockUseResolvedApmIndices).toHaveBeenCalledWith({
      http,
      indicesSource: { indices: PARENT_INDICES },
    });

    fireEvent.click(screen.getByTestId('openFullTraceMock'));

    expect(mockTraceWaterfallFlyout).toHaveBeenCalledWith(
      expect.objectContaining({
        indicesSource: { indices: PARENT_INDICES },
      })
    );
  });

  it('keeps the full-trace flyout on the parent source while those indices are still loading', () => {
    mockUseResolvedApmIndices.mockReturnValue(undefined);

    render(<TransactionDetailFlyout {...BASE_PROPS} indicesSource={{ indices: undefined }} />);

    fireEvent.click(screen.getByTestId('openFullTraceMock'));

    expect(mockUseResolvedApmIndices).toHaveBeenCalledWith({
      http,
      indicesSource: { indices: undefined },
    });
    expect(mockTraceWaterfallFlyout).toHaveBeenCalledWith(
      expect.objectContaining({
        indicesSource: { indices: undefined },
      })
    );
  });
});
