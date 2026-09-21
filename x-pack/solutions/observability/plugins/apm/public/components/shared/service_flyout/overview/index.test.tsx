/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { ServiceFlyoutTransactionsSection } from '@kbn/apm-ui-shared';
import type { ServiceFlyoutService } from '..';
import { ServiceFlyoutOverview } from '.';

const mockUseServiceHasSystemMetrics = jest.fn<
  { hasSystemMetrics: boolean | undefined; isLoading: boolean },
  []
>();
let transactionsSectionProps: React.ComponentProps<typeof ServiceFlyoutTransactionsSection> | null =
  null;

const mockUseServiceFlyoutContext = jest.fn();
const mockUseProjectRouting = jest.fn<string | undefined, []>(() => undefined);
jest.mock('../service_flyout_context', () => ({
  useServiceFlyoutContext: () => mockUseServiceFlyoutContext(),
}));

jest.mock('../hooks/use_service_has_system_metrics', () => ({
  useServiceHasSystemMetrics: () => mockUseServiceHasSystemMetrics(),
}));

// Avoid pulling the real plugin module (heavy import graph) into this test.
jest.mock('../hooks/use_project_routing', () => ({
  useProjectRouting: () => mockUseProjectRouting(),
}));

jest.mock('@kbn/apm-ui-shared', () => ({
  ServiceFlyoutTransactionsSection: (
    props: React.ComponentProps<typeof ServiceFlyoutTransactionsSection>
  ) => {
    transactionsSectionProps = props;
    return <div data-test-subj="transactionsSectionMock" />;
  },
}));

jest.mock('./query_controls', () => ({
  ServiceFlyoutQueryControls: () => <div data-test-subj="queryControlsMock" />,
}));

jest.mock('./lens_chart', () => ({
  ServiceFlyoutLensChart: () => <div data-test-subj="lensChartMock" />,
}));

const mockTransactionDetailFlyoutProps = jest.fn();
jest.mock('../../transaction_detail_flyout', () => ({
  TransactionDetailFlyout: (props: {
    filters: { transactionName: string };
    onClose: () => void;
    preferDocumentBasedCharts?: boolean;
    schema?: string;
    indices?: unknown;
    deps: { lens?: unknown; dataViews?: unknown };
  }) => {
    mockTransactionDetailFlyoutProps(props);
    return (
      <div data-test-subj="transactionDetailFlyoutMock">
        <span>{props.filters.transactionName}</span>
        <button type="button" onClick={props.onClose}>
          close
        </button>
      </div>
    );
  },
}));
const mockServiceFlyoutApmCharts = jest.fn((_props: unknown) => (
  <div data-test-subj="apmChartsMock" />
));
jest.mock('./apm_charts', () => ({
  ServiceFlyoutApmCharts: (props: unknown) => mockServiceFlyoutApmCharts(props as never),
}));

const service: ServiceFlyoutService = {
  name: 'opbeans-java',
  agentName: 'java',
};

function buildContextValue({
  refreshToken = 0,
  schema = 'ecs' as const,
  filters = {},
  preferDocumentBasedCharts,
  transactionType = 'request',
}: {
  refreshToken?: number;
  schema?: 'ecs' | 'otel' | 'unknown';
  filters?: Record<string, unknown>;
  preferDocumentBasedCharts?: boolean;
  transactionType?: string;
} = {}) {
  return {
    preferDocumentBasedCharts,
    deps: {
      core: {
        http: {},
        notifications: { toasts: { addDanger: jest.fn() } },
      } as any,
      share: { url: { locators: { get: jest.fn() } } } as any,
      lens: undefined as any,
      dataViews: undefined as any,
    },
    service,
    indices: null,
    flyoutHistoryKey: Symbol('test-service-flyout-history'),
    capabilities: {
      loading: false,
      error: undefined,
      schema,
      header: { serviceNameLink: true, badges: true },
      overview: { transactions: true, transactionTypeFilter: true, infraMetrics: true },
      footer: { alerts: true, slos: true },
    },
    filters: {
      environment: 'production' as const,
      setEnvironment: jest.fn(),
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      start: '2026-09-11T00:00:00.000Z',
      end: '2026-09-18T15:20:34.096Z',
      setRange: jest.fn(),
      transactionType,
      setTransactionType: jest.fn(),
      refreshToken,
      onRefresh: jest.fn(),
      ...filters,
    },
  };
}

function renderOverview({
  refreshToken,
  transactionType,
  preferDocumentBasedCharts,
  schema,
}: {
  refreshToken?: number;
  transactionType?: string;
  preferDocumentBasedCharts?: boolean;
  schema?: 'ecs' | 'otel' | 'unknown';
} = {}) {
  mockUseServiceFlyoutContext.mockReturnValue(
    buildContextValue({ refreshToken, transactionType, preferDocumentBasedCharts, schema })
  );
  return render(
    <IntlProvider locale="en">
      <ServiceFlyoutOverview />
    </IntlProvider>
  );
}

const PRODUCTION_LIST_FILTERS = {
  environment: 'production',
  start: '2026-09-11T00:00:00.000Z',
  end: '2026-09-18T15:20:34.096Z',
  transactionType: 'request',
};

const STAGING_LIST_FILTERS = {
  environment: 'staging',
  start: '2026-09-18T14:20:34.096Z',
  end: '2026-09-18T15:15:34.096Z',
  transactionType: 'request',
};

const MOBILE_LIST_FILTERS = {
  ...PRODUCTION_LIST_FILTERS,
  transactionType: 'mobile',
};

function listMeta(
  isLoading: boolean,
  filters: typeof PRODUCTION_LIST_FILTERS,
  error?: Error,
  isSearchFiltered = false
) {
  return { isLoading, error, filters, isSearchFiltered };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseProjectRouting.mockReturnValue(undefined);
  transactionsSectionProps = null;
});

describe('ServiceFlyoutOverview capabilities loading and error states', () => {
  it('renders a skeleton while capabilities are loading', () => {
    mockUseServiceFlyoutContext.mockReturnValue({
      ...buildContextValue(),
      capabilities: {
        loading: true,
        error: undefined,
        schema: undefined,
        header: undefined,
        overview: undefined,
        footer: undefined,
      },
    });
    mockUseServiceHasSystemMetrics.mockReturnValue({
      hasSystemMetrics: undefined,
      isLoading: true,
    });

    render(
      <IntlProvider locale="en">
        <ServiceFlyoutOverview />
      </IntlProvider>
    );

    expect(screen.getByTestId('serviceFlyoutOverviewSkeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('serviceFlyoutOverview')).not.toBeInTheDocument();
  });

  it('renders the overview with full capabilities when the capabilities fetch fails', () => {
    mockUseServiceFlyoutContext.mockReturnValue({
      ...buildContextValue(),
      capabilities: {
        loading: false,
        error: undefined,
        schema: 'unknown' as const,
        header: { serviceNameLink: true, badges: true },
        overview: { transactions: true, transactionTypeFilter: true, infraMetrics: true },
        footer: { alerts: true, slos: true },
      },
    });
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });

    render(
      <IntlProvider locale="en">
        <ServiceFlyoutOverview />
      </IntlProvider>
    );

    expect(screen.getByTestId('serviceFlyoutOverview')).toBeInTheDocument();
    expect(screen.queryByTestId('serviceFlyoutOverviewSkeleton')).not.toBeInTheDocument();
  });
});

describe('ServiceFlyoutOverview key metrics chart implementation per schema', () => {
  it('renders the shared APM chart components for ECS services', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });
    mockUseServiceFlyoutContext.mockReturnValue(buildContextValue({ schema: 'ecs' }));

    render(
      <IntlProvider locale="en">
        <ServiceFlyoutOverview />
      </IntlProvider>
    );

    expect(screen.getByTestId('apmChartsMock')).toBeInTheDocument();
    expect(screen.queryByTestId('lensChartMock')).not.toBeInTheDocument();
    expect(screen.getByTestId('serviceFlyoutSection-keyMetrics')).toBeInTheDocument();
  });

  it('renders the shared APM chart components for unknown-schema services', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });
    mockUseServiceFlyoutContext.mockReturnValue(buildContextValue({ schema: 'unknown' }));

    render(
      <IntlProvider locale="en">
        <ServiceFlyoutOverview />
      </IntlProvider>
    );

    expect(screen.getByTestId('apmChartsMock')).toBeInTheDocument();
  });

  it('keeps the ES|QL Lens charts for ECS services in document-based hosts (Discover)', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });
    mockUseServiceFlyoutContext.mockReturnValue({
      ...buildContextValue({ schema: 'ecs', preferDocumentBasedCharts: true }),
      indices: {
        transaction: 'traces-apm*',
        span: 'traces-apm*',
        error: 'logs-apm*',
        metric: 'metrics-apm*',
        onboarding: 'apm-*',
      },
    });

    render(
      <IntlProvider locale="en">
        <ServiceFlyoutOverview />
      </IntlProvider>
    );

    expect(screen.getAllByTestId('lensChartMock').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('apmChartsMock')).not.toBeInTheDocument();
  });

  it('keeps the ES|QL Lens charts for OTel services', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });
    mockUseServiceFlyoutContext.mockReturnValue({
      ...buildContextValue({ schema: 'otel' }),
      indices: {
        transaction: 'traces-apm*',
        span: 'traces-apm*',
        error: 'logs-apm*',
        metric: 'metrics-apm*',
        onboarding: 'apm-*',
      },
    });

    render(
      <IntlProvider locale="en">
        <ServiceFlyoutOverview />
      </IntlProvider>
    );

    expect(screen.getAllByTestId('lensChartMock').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('apmChartsMock')).not.toBeInTheDocument();
  });

  it('seeds the latency aggregation type from the flyout filters', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });
    mockUseServiceFlyoutContext.mockReturnValue(
      buildContextValue({ filters: { latencyAggregationType: 'p95' } })
    );

    render(
      <IntlProvider locale="en">
        <ServiceFlyoutOverview />
      </IntlProvider>
    );

    expect(mockServiceFlyoutApmCharts).toHaveBeenCalledWith(
      expect.objectContaining({ latencyAggregationType: 'p95' })
    );
  });
});

describe('ServiceFlyoutOverview OTel key metrics indices loading and error states', () => {
  it('renders a skeleton for key metrics while indices are loading', () => {
    mockUseServiceFlyoutContext.mockReturnValue({
      ...buildContextValue({ schema: 'otel' }),
      indices: undefined,
    });
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });

    render(
      <IntlProvider locale="en">
        <ServiceFlyoutOverview />
      </IntlProvider>
    );

    expect(screen.getByTestId('serviceFlyoutSection-keyMetrics-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('lensChartMock')).not.toBeInTheDocument();
    expect(screen.queryByTestId('serviceFlyoutSection-keyMetrics-error')).not.toBeInTheDocument();
  });

  it('renders a warning callout for key metrics when indices fail to load', () => {
    mockUseServiceFlyoutContext.mockReturnValue({
      ...buildContextValue({ schema: 'otel' }),
      indices: null,
    });
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });

    render(
      <IntlProvider locale="en">
        <ServiceFlyoutOverview />
      </IntlProvider>
    );

    expect(screen.getByTestId('serviceFlyoutSection-keyMetrics-error')).toBeInTheDocument();
    expect(screen.queryByTestId('lensChartMock')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('serviceFlyoutSection-keyMetrics-skeleton')
    ).not.toBeInTheDocument();
  });

  it('renders key metrics charts when indices are available', () => {
    mockUseServiceFlyoutContext.mockReturnValue({
      ...buildContextValue({ schema: 'otel' }),
      indices: {
        transaction: 'traces-apm*',
        span: 'traces-apm*',
        error: 'logs-apm*',
        metric: 'metrics-apm*',
        onboarding: 'apm-*',
      },
    });
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });

    render(
      <IntlProvider locale="en">
        <ServiceFlyoutOverview />
      </IntlProvider>
    );

    expect(screen.getAllByTestId('lensChartMock').length).toBeGreaterThan(0);
    expect(
      screen.queryByTestId('serviceFlyoutSection-keyMetrics-skeleton')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('serviceFlyoutSection-keyMetrics-error')).not.toBeInTheDocument();
  });
});

describe('ServiceFlyoutOverview transactions section props', () => {
  it('passes resolved ISO timestamps to ServiceFlyoutTransactionsSection, not raw relative date strings', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });
    renderOverview();

    expect(transactionsSectionProps?.start).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(transactionsSectionProps?.end).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(transactionsSectionProps?.start).not.toBe('now-15m');
    expect(transactionsSectionProps?.end).not.toBe('now');
  });

  it('forwards refreshToken to the transactions table and the nested transaction flyout', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });
    renderOverview({ refreshToken: 42 });

    expect(transactionsSectionProps?.refreshToken).toBe(42);

    act(() => {
      transactionsSectionProps!.onTransactionClick!({
        name: 'GET /api/orders',
        transactionType: 'request',
        latency: { value: 1 },
        throughput: { value: 1 },
        errorRate: { value: 0 },
      });
    });

    expect(mockTransactionDetailFlyoutProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ refreshToken: 42 })
    );
  });

  it('opens TransactionDetailFlyout when a transaction name is clicked', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });
    renderOverview({ preferDocumentBasedCharts: true, schema: 'ecs' });

    expect(screen.queryByTestId('transactionDetailFlyoutMock')).not.toBeInTheDocument();
    expect(transactionsSectionProps?.onTransactionClick).toEqual(expect.any(Function));
    expect(transactionsSectionProps?.isTransactionExpanded).toEqual(expect.any(Function));

    act(() => {
      transactionsSectionProps!.onTransactionClick!({
        name: 'GET /api/orders',
        transactionType: 'request',
        latency: { value: 1 },
        throughput: { value: 1 },
        errorRate: { value: 0 },
      });
    });

    expect(screen.getByTestId('transactionDetailFlyoutMock')).toHaveTextContent('GET /api/orders');
    expect(mockTransactionDetailFlyoutProps).toHaveBeenCalledWith(
      expect.objectContaining({
        preferDocumentBasedCharts: true,
        schema: 'ecs',
        indices: null,
        deps: expect.objectContaining({
          lens: undefined,
          dataViews: undefined,
        }),
      })
    );
    expect(
      transactionsSectionProps!.isTransactionExpanded!({
        name: 'GET /api/orders',
        transactionType: 'request',
        latency: { value: 1 },
        throughput: { value: 1 },
        errorRate: { value: 0 },
      })
    ).toBe(true);
  });

  it('closes TransactionDetailFlyout when the same transaction is clicked again', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });
    renderOverview();

    const item = {
      name: 'GET /api/orders',
      transactionType: 'request',
      latency: { value: 1 },
      throughput: { value: 1 },
      errorRate: { value: 0 },
    };

    act(() => {
      transactionsSectionProps!.onTransactionClick!(item);
    });
    expect(screen.getByTestId('transactionDetailFlyoutMock')).toBeInTheDocument();

    act(() => {
      transactionsSectionProps!.onTransactionClick!(item);
    });
    expect(screen.queryByTestId('transactionDetailFlyoutMock')).not.toBeInTheDocument();
  });

  it('does not open TransactionDetailFlyout when transaction type is missing', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });
    renderOverview({ transactionType: '' });

    act(() => {
      transactionsSectionProps!.onTransactionClick!({
        name: 'GET /api/orders',
        latency: { value: 1 },
        throughput: { value: 1 },
        errorRate: { value: 0 },
      });
    });

    expect(screen.queryByTestId('transactionDetailFlyoutMock')).not.toBeInTheDocument();
  });

  it('closes TransactionDetailFlyout when onClose is called', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });
    const { getByRole, queryByTestId } = renderOverview();

    act(() => {
      transactionsSectionProps!.onTransactionClick!({
        name: 'GET /api/orders',
        latency: { value: 1 },
        throughput: { value: 1 },
        errorRate: { value: 0 },
      });
    });

    expect(queryByTestId('transactionDetailFlyoutMock')).toBeInTheDocument();
    act(() => {
      getByRole('button', { name: 'close' }).click();
    });
    expect(queryByTestId('transactionDetailFlyoutMock')).not.toBeInTheDocument();
  });

  it('keeps nested transaction flyout filters live when the selection remains after a filter change', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });
    const { rerender } = renderOverview();

    act(() => {
      transactionsSectionProps!.onTransactionClick!({
        name: 'GET /api/orders',
        transactionType: 'request',
        latency: { value: 1 },
        throughput: { value: 1 },
        errorRate: { value: 0 },
      });
    });

    expect(mockTransactionDetailFlyoutProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isFiltersStale: false,
        filters: expect.objectContaining({
          transactionName: 'GET /api/orders',
          transactionType: 'request',
          environment: 'production',
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          start: '2026-09-11T00:00:00.000Z',
          end: '2026-09-18T15:20:34.096Z',
        }),
      })
    );

    mockUseServiceFlyoutContext.mockReturnValue(
      buildContextValue({
        filters: {
          environment: 'staging',
          rangeFrom: 'now-1h',
          rangeTo: 'now-5m',
          start: '2026-09-18T14:20:34.096Z',
          end: '2026-09-18T15:15:34.096Z',
        },
      })
    );
    rerender(
      <IntlProvider locale="en">
        <ServiceFlyoutOverview />
      </IntlProvider>
    );

    // Surviving selections stay on the confirmed snapshot until the list settles.
    expect(mockTransactionDetailFlyoutProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isFiltersStale: false,
        isFiltersPending: true,
        filters: expect.objectContaining({
          environment: 'production',
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          start: '2026-09-11T00:00:00.000Z',
          end: '2026-09-18T15:20:34.096Z',
        }),
      })
    );

    // A settle with the previous list (before loading starts) must not confirm yet.
    act(() => {
      transactionsSectionProps!.onTransactionsChange!(
        [
          {
            name: 'GET /api/orders',
            transactionType: 'request',
            latency: { value: 1 },
            throughput: { value: 1 },
            errorRate: { value: 0 },
          },
        ],
        listMeta(false, STAGING_LIST_FILTERS)
      );
    });

    act(() => {
      transactionsSectionProps!.onTransactionsChange!(
        [
          {
            name: 'GET /api/orders',
            transactionType: 'request',
            latency: { value: 1 },
            throughput: { value: 1 },
            errorRate: { value: 0 },
          },
        ],
        listMeta(true, STAGING_LIST_FILTERS)
      );
    });

    act(() => {
      transactionsSectionProps!.onTransactionsChange!(
        [
          {
            name: 'GET /api/orders',
            transactionType: 'request',
            latency: { value: 1 },
            throughput: { value: 1 },
            errorRate: { value: 0 },
          },
        ],
        listMeta(false, STAGING_LIST_FILTERS)
      );
    });

    expect(mockTransactionDetailFlyoutProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isFiltersStale: false,
        isFiltersPending: false,
        filters: expect.objectContaining({
          transactionName: 'GET /api/orders',
          transactionType: 'request',
          environment: 'staging',
          rangeFrom: 'now-1h',
          rangeTo: 'now-5m',
          start: '2026-09-18T14:20:34.096Z',
          end: '2026-09-18T15:15:34.096Z',
        }),
      })
    );
  });

  it('freezes nested transaction flyout filters when the selection is missing after a filter change', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });
    const { rerender } = renderOverview();

    act(() => {
      transactionsSectionProps!.onTransactionClick!({
        name: 'GET /api/orders',
        transactionType: 'request',
        latency: { value: 1 },
        throughput: { value: 1 },
        errorRate: { value: 0 },
      });
    });

    mockUseServiceFlyoutContext.mockReturnValue(
      buildContextValue({
        filters: {
          environment: 'staging',
          rangeFrom: 'now-1h',
          rangeTo: 'now-5m',
          start: '2026-09-18T14:20:34.096Z',
          end: '2026-09-18T15:15:34.096Z',
        },
      })
    );
    rerender(
      <IntlProvider locale="en">
        <ServiceFlyoutOverview />
      </IntlProvider>
    );

    // Stay on the confirmed snapshot until the list settles; then freeze if missing.
    act(() => {
      transactionsSectionProps!.onTransactionsChange!(
        [
          {
            name: 'GET /api/orders',
            transactionType: 'request',
            latency: { value: 1 },
            throughput: { value: 1 },
            errorRate: { value: 0 },
          },
        ],
        listMeta(false, STAGING_LIST_FILTERS)
      );
    });

    expect(mockTransactionDetailFlyoutProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isFiltersStale: false,
        filters: expect.objectContaining({
          environment: 'production',
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          start: '2026-09-11T00:00:00.000Z',
          end: '2026-09-18T15:20:34.096Z',
        }),
      })
    );

    act(() => {
      transactionsSectionProps!.onTransactionsChange!([], listMeta(true, STAGING_LIST_FILTERS));
    });

    act(() => {
      transactionsSectionProps!.onTransactionsChange!(
        [
          {
            name: 'POST /api/other',
            transactionType: 'request',
            latency: { value: 1 },
            throughput: { value: 1 },
            errorRate: { value: 0 },
          },
        ],
        listMeta(false, STAGING_LIST_FILTERS)
      );
    });

    expect(mockTransactionDetailFlyoutProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isFiltersStale: true,
        filters: expect.objectContaining({
          transactionName: 'GET /api/orders',
          transactionType: 'request',
          environment: 'production',
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          start: '2026-09-11T00:00:00.000Z',
          end: '2026-09-18T15:20:34.096Z',
        }),
      })
    );
  });

  it('freezes nested transaction flyout filters when the selection is missing after a transaction type change', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });
    const { rerender } = renderOverview();

    act(() => {
      transactionsSectionProps!.onTransactionClick!({
        name: 'GET /api/orders',
        transactionType: 'request',
        latency: { value: 1 },
        throughput: { value: 1 },
        errorRate: { value: 0 },
      });
    });

    mockUseServiceFlyoutContext.mockReturnValue(
      buildContextValue({
        transactionType: 'mobile',
      })
    );
    rerender(
      <IntlProvider locale="en">
        <ServiceFlyoutOverview />
      </IntlProvider>
    );

    // Previous list still includes the selection — must not confirm the new type filter.
    act(() => {
      transactionsSectionProps!.onTransactionsChange!(
        [
          {
            name: 'GET /api/orders',
            transactionType: 'request',
            latency: { value: 1 },
            throughput: { value: 1 },
            errorRate: { value: 0 },
          },
        ],
        listMeta(false, MOBILE_LIST_FILTERS)
      );
    });

    expect(mockTransactionDetailFlyoutProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isFiltersStale: false,
      })
    );

    act(() => {
      transactionsSectionProps!.onTransactionsChange!([], listMeta(true, MOBILE_LIST_FILTERS));
    });

    act(() => {
      transactionsSectionProps!.onTransactionsChange!(
        [
          {
            name: 'POST /api/mobile',
            transactionType: 'mobile',
            latency: { value: 1 },
            throughput: { value: 1 },
            errorRate: { value: 0 },
          },
        ],
        listMeta(false, MOBILE_LIST_FILTERS)
      );
    });

    expect(mockTransactionDetailFlyoutProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isFiltersStale: true,
        filters: expect.objectContaining({
          transactionName: 'GET /api/orders',
          transactionType: 'request',
          environment: 'production',
          rangeFrom: 'now-15m',
          rangeTo: 'now',
        }),
      })
    );
  });

  it('does not freeze when typing in the transactions search hides the selection', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });
    renderOverview();

    act(() => {
      transactionsSectionProps!.onTransactionClick!({
        name: 'GET /api/orders',
        transactionType: 'request',
        latency: { value: 1 },
        throughput: { value: 1 },
        errorRate: { value: 0 },
      });
    });

    // Server-side search omits the selected row under the same parent filters.
    act(() => {
      transactionsSectionProps!.onTransactionsChange!(
        [
          {
            name: 'POST /api/other',
            transactionType: 'request',
            latency: { value: 1 },
            throughput: { value: 1 },
            errorRate: { value: 0 },
          },
        ],
        listMeta(false, PRODUCTION_LIST_FILTERS, undefined, true)
      );
    });

    expect(mockTransactionDetailFlyoutProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isFiltersStale: false,
        filters: expect.objectContaining({
          transactionName: 'GET /api/orders',
          environment: 'production',
          start: '2026-09-11T00:00:00.000Z',
          end: '2026-09-18T15:20:34.096Z',
        }),
      })
    );
  });

  it('does not freeze when search is active and a filter change still includes the selection', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });
    const { rerender } = renderOverview();

    act(() => {
      transactionsSectionProps!.onTransactionClick!({
        name: 'GET /api/orders',
        transactionType: 'request',
        latency: { value: 1 },
        throughput: { value: 1 },
        errorRate: { value: 0 },
      });
    });

    // Search hides the selection under the current filters.
    act(() => {
      transactionsSectionProps!.onTransactionsChange!(
        [
          {
            name: 'POST /api/other',
            transactionType: 'request',
            latency: { value: 1 },
            throughput: { value: 1 },
            errorRate: { value: 0 },
          },
        ],
        listMeta(false, PRODUCTION_LIST_FILTERS, undefined, true)
      );
    });

    mockUseServiceFlyoutContext.mockReturnValue(
      buildContextValue({
        filters: {
          environment: 'staging',
          rangeFrom: 'now-1h',
          rangeTo: 'now-5m',
          start: '2026-09-18T14:20:34.096Z',
          end: '2026-09-18T15:15:34.096Z',
        },
      })
    );
    rerender(
      <IntlProvider locale="en">
        <ServiceFlyoutOverview />
      </IntlProvider>
    );

    act(() => {
      transactionsSectionProps!.onTransactionsChange!([], listMeta(true, STAGING_LIST_FILTERS));
    });

    // Search-filtered settle under the new filters must not freeze.
    act(() => {
      transactionsSectionProps!.onTransactionsChange!(
        [
          {
            name: 'POST /api/other',
            transactionType: 'request',
            latency: { value: 1 },
            throughput: { value: 1 },
            errorRate: { value: 0 },
          },
        ],
        listMeta(false, STAGING_LIST_FILTERS, undefined, true)
      );
    });

    expect(mockTransactionDetailFlyoutProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ isFiltersStale: false })
    );

    // Unsearched settle with the selection present confirms live filters.
    act(() => {
      transactionsSectionProps!.onTransactionsChange!(
        [
          {
            name: 'GET /api/orders',
            transactionType: 'request',
            latency: { value: 1 },
            throughput: { value: 1 },
            errorRate: { value: 0 },
          },
        ],
        listMeta(false, STAGING_LIST_FILTERS)
      );
    });

    expect(mockTransactionDetailFlyoutProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isFiltersStale: false,
        filters: expect.objectContaining({
          environment: 'staging',
          start: '2026-09-18T14:20:34.096Z',
          end: '2026-09-18T15:15:34.096Z',
        }),
      })
    );
  });

  it('clears the stale callout and syncs live filters when the selection reappears', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });
    const { rerender } = renderOverview();

    act(() => {
      transactionsSectionProps!.onTransactionClick!({
        name: 'GET /api/orders',
        transactionType: 'request',
        latency: { value: 1 },
        throughput: { value: 1 },
        errorRate: { value: 0 },
      });
    });

    mockUseServiceFlyoutContext.mockReturnValue(
      buildContextValue({
        filters: {
          environment: 'staging',
          rangeFrom: 'now-1h',
          rangeTo: 'now-5m',
          start: '2026-09-18T14:20:34.096Z',
          end: '2026-09-18T15:15:34.096Z',
        },
      })
    );
    rerender(
      <IntlProvider locale="en">
        <ServiceFlyoutOverview />
      </IntlProvider>
    );

    act(() => {
      transactionsSectionProps!.onTransactionsChange!([], listMeta(true, STAGING_LIST_FILTERS));
    });
    act(() => {
      transactionsSectionProps!.onTransactionsChange!(
        [
          {
            name: 'POST /api/other',
            transactionType: 'request',
            latency: { value: 1 },
            throughput: { value: 1 },
            errorRate: { value: 0 },
          },
        ],
        listMeta(false, STAGING_LIST_FILTERS)
      );
    });

    expect(mockTransactionDetailFlyoutProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isFiltersStale: true,
        filters: expect.objectContaining({
          environment: 'production',
          start: '2026-09-11T00:00:00.000Z',
          end: '2026-09-18T15:20:34.096Z',
        }),
      })
    );

    // Selection comes back under the live filters — clear stale and sync.
    act(() => {
      transactionsSectionProps!.onTransactionsChange!(
        [
          {
            name: 'GET /api/orders',
            transactionType: 'request',
            latency: { value: 1 },
            throughput: { value: 1 },
            errorRate: { value: 0 },
          },
        ],
        listMeta(false, STAGING_LIST_FILTERS)
      );
    });

    expect(mockTransactionDetailFlyoutProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isFiltersStale: false,
        filters: expect.objectContaining({
          transactionName: 'GET /api/orders',
          environment: 'staging',
          rangeFrom: 'now-1h',
          rangeTo: 'now-5m',
          start: '2026-09-18T14:20:34.096Z',
          end: '2026-09-18T15:15:34.096Z',
        }),
      })
    );
  });

  it('does not confirm or mark stale when the transactions request fails', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });
    const { rerender } = renderOverview();

    act(() => {
      transactionsSectionProps!.onTransactionClick!({
        name: 'GET /api/orders',
        transactionType: 'request',
        latency: { value: 1 },
        throughput: { value: 1 },
        errorRate: { value: 0 },
      });
    });

    mockUseServiceFlyoutContext.mockReturnValue(
      buildContextValue({
        filters: {
          environment: 'staging',
          rangeFrom: 'now-1h',
          rangeTo: 'now-5m',
          start: '2026-09-18T14:20:34.096Z',
          end: '2026-09-18T15:15:34.096Z',
        },
      })
    );
    rerender(
      <IntlProvider locale="en">
        <ServiceFlyoutOverview />
      </IntlProvider>
    );

    act(() => {
      transactionsSectionProps!.onTransactionsChange!([], listMeta(true, STAGING_LIST_FILTERS));
    });

    // Retained rows from the failed request must not confirm the new filters or freeze.
    act(() => {
      transactionsSectionProps!.onTransactionsChange!(
        [
          {
            name: 'GET /api/orders',
            transactionType: 'request',
            latency: { value: 1 },
            throughput: { value: 1 },
            errorRate: { value: 0 },
          },
        ],
        listMeta(false, STAGING_LIST_FILTERS, new Error('main stats failed'))
      );
    });

    expect(mockTransactionDetailFlyoutProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isFiltersStale: false,
      })
    );

    act(() => {
      transactionsSectionProps!.onTransactionsChange!(
        [
          {
            name: 'POST /api/other',
            transactionType: 'request',
            latency: { value: 1 },
            throughput: { value: 1 },
            errorRate: { value: 0 },
          },
        ],
        listMeta(false, STAGING_LIST_FILTERS)
      );
    });

    expect(mockTransactionDetailFlyoutProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isFiltersStale: true,
        filters: expect.objectContaining({
          environment: 'production',
          start: '2026-09-11T00:00:00.000Z',
          end: '2026-09-18T15:20:34.096Z',
        }),
      })
    );
  });

  it('does not confirm live filters from a click on the stale list after a filter change', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });
    const { rerender } = renderOverview();

    act(() => {
      transactionsSectionProps!.onTransactionClick!({
        name: 'GET /api/orders',
        transactionType: 'request',
        latency: { value: 1 },
        throughput: { value: 1 },
        errorRate: { value: 0 },
      });
    });

    mockUseServiceFlyoutContext.mockReturnValue(
      buildContextValue({
        filters: {
          environment: 'staging',
          rangeFrom: 'now-1h',
          rangeTo: 'now-5m',
          start: '2026-09-18T14:20:34.096Z',
          end: '2026-09-18T15:15:34.096Z',
        },
      })
    );
    rerender(
      <IntlProvider locale="en">
        <ServiceFlyoutOverview />
      </IntlProvider>
    );

    // Stale list still on screen (loading not seen yet). A click must not promote live
    // filters to confirmedFilters — otherwise a missing settle never marks stale.
    act(() => {
      transactionsSectionProps!.onTransactionClick!({
        name: 'POST /api/other',
        transactionType: 'request',
        latency: { value: 1 },
        throughput: { value: 1 },
        errorRate: { value: 0 },
      });
    });

    expect(screen.getByTestId('transactionDetailFlyoutMock')).toHaveTextContent('GET /api/orders');

    act(() => {
      transactionsSectionProps!.onTransactionsChange!(
        [
          {
            name: 'GET /api/orders',
            transactionType: 'request',
            latency: { value: 1 },
            throughput: { value: 1 },
            errorRate: { value: 0 },
          },
        ],
        listMeta(false, STAGING_LIST_FILTERS)
      );
    });
    act(() => {
      transactionsSectionProps!.onTransactionsChange!([], listMeta(true, STAGING_LIST_FILTERS));
    });
    act(() => {
      transactionsSectionProps!.onTransactionsChange!(
        [
          {
            name: 'POST /api/other',
            transactionType: 'request',
            latency: { value: 1 },
            throughput: { value: 1 },
            errorRate: { value: 0 },
          },
        ],
        listMeta(false, STAGING_LIST_FILTERS)
      );
    });

    expect(mockTransactionDetailFlyoutProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isFiltersStale: true,
        filters: expect.objectContaining({
          transactionName: 'GET /api/orders',
          transactionType: 'request',
          environment: 'production',
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          start: '2026-09-11T00:00:00.000Z',
          end: '2026-09-18T15:20:34.096Z',
        }),
      })
    );
  });

  it('freezes the nested transaction flyout when the transactions section becomes unavailable', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });
    const { rerender } = renderOverview();

    act(() => {
      transactionsSectionProps!.onTransactionClick!({
        name: 'GET /api/orders',
        transactionType: 'request',
        latency: { value: 1 },
        throughput: { value: 1 },
        errorRate: { value: 0 },
      });
    });

    expect(screen.getByTestId('transactionDetailFlyoutMock')).toBeInTheDocument();
    expect(transactionsSectionProps).not.toBeNull();

    // Filters change and capabilities resolve to OTel — transactions table unmounts.
    mockUseServiceFlyoutContext.mockReturnValue({
      ...buildContextValue({
        filters: {
          environment: 'staging',
          rangeFrom: 'now-1h',
          rangeTo: 'now-5m',
          start: '2026-09-18T14:20:34.096Z',
          end: '2026-09-18T15:15:34.096Z',
        },
        schema: 'otel',
      }),
      capabilities: {
        loading: false,
        error: undefined,
        schema: 'otel' as const,
        header: { serviceNameLink: false, badges: false },
        overview: { transactions: false, transactionTypeFilter: false, infraMetrics: false },
        footer: { alerts: false, slos: false },
      },
    });
    rerender(
      <IntlProvider locale="en">
        <ServiceFlyoutOverview />
      </IntlProvider>
    );

    expect(screen.queryByTestId('serviceFlyoutSection-transactions')).not.toBeInTheDocument();
    expect(mockTransactionDetailFlyoutProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isFiltersStale: true,
        filters: expect.objectContaining({
          transactionName: 'GET /api/orders',
          transactionType: 'request',
          environment: 'production',
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          start: '2026-09-11T00:00:00.000Z',
          end: '2026-09-18T15:20:34.096Z',
        }),
      })
    );
  });

  it('forwards projectRouting to ServiceFlyoutTransactionsSection', () => {
    mockUseProjectRouting.mockReturnValue('_alias:*');
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });
    renderOverview();

    expect(transactionsSectionProps?.projectRouting).toBe('_alias:*');
  });

  it('forwards undefined projectRouting when CPS routing is unset', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });
    renderOverview();

    expect(transactionsSectionProps?.projectRouting).toBeUndefined();
  });
});

describe('ServiceFlyoutOverview infrastructure section visibility', () => {
  it('hides the infrastructure section while system metrics data is loading', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({
      hasSystemMetrics: undefined,
      isLoading: true,
    });

    renderOverview();

    expect(
      screen.queryByTestId('serviceFlyoutSection-infrastructureMetrics')
    ).not.toBeInTheDocument();
  });

  it('renders a skeleton placeholder while system metrics data is loading', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({
      hasSystemMetrics: undefined,
      isLoading: true,
    });

    renderOverview();

    expect(
      screen.getByTestId('serviceFlyoutSection-infrastructureMetricsSkeleton')
    ).toBeInTheDocument();
  });

  it('hides both skeleton and infrastructure section when the fetch fails', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({
      hasSystemMetrics: undefined,
      isLoading: false,
    });

    renderOverview();

    expect(
      screen.queryByTestId('serviceFlyoutSection-infrastructureMetricsSkeleton')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('serviceFlyoutSection-infrastructureMetrics')
    ).not.toBeInTheDocument();
  });

  it('hides the infrastructure section when the service has no system metrics', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });

    renderOverview();

    expect(
      screen.queryByTestId('serviceFlyoutSection-infrastructureMetrics')
    ).not.toBeInTheDocument();
  });

  it('shows the infrastructure section when the service has system metrics', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: true, isLoading: false });

    renderOverview();

    expect(screen.getByTestId('serviceFlyoutSection-infrastructureMetrics')).toBeInTheDocument();
  });

  it('always renders the key metrics section regardless of system metrics', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });

    renderOverview();

    expect(screen.getByTestId('serviceFlyoutSection-keyMetrics')).toBeInTheDocument();
  });

  it('renders a chart skeleton for infra metrics while indices are loading', () => {
    mockUseServiceFlyoutContext.mockReturnValue({
      ...buildContextValue(),
      indices: undefined,
    });
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: true, isLoading: false });

    render(
      <IntlProvider locale="en">
        <ServiceFlyoutOverview />
      </IntlProvider>
    );

    expect(
      screen.getByTestId('serviceFlyoutSection-infrastructureMetrics-skeleton')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('serviceFlyoutSection-infrastructureMetrics-error')
    ).not.toBeInTheDocument();
  });

  it('renders a warning callout for infra metrics when indices fail to load', () => {
    mockUseServiceFlyoutContext.mockReturnValue({
      ...buildContextValue(),
      indices: null,
    });
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: true, isLoading: false });

    render(
      <IntlProvider locale="en">
        <ServiceFlyoutOverview />
      </IntlProvider>
    );

    expect(
      screen.getByTestId('serviceFlyoutSection-infrastructureMetrics-error')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('serviceFlyoutSection-infrastructureMetrics-skeleton')
    ).not.toBeInTheDocument();
  });

  it('renders infra metrics charts when indices are available', () => {
    mockUseServiceFlyoutContext.mockReturnValue({
      ...buildContextValue(),
      indices: {
        transaction: 'traces-apm*',
        span: 'traces-apm*',
        error: 'logs-apm*',
        metric: 'metrics-apm*',
        onboarding: 'apm-*',
      },
    });
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: true, isLoading: false });

    render(
      <IntlProvider locale="en">
        <ServiceFlyoutOverview />
      </IntlProvider>
    );

    expect(screen.getAllByTestId('lensChartMock').length).toBeGreaterThan(0);
    expect(
      screen.queryByTestId('serviceFlyoutSection-infrastructureMetrics-skeleton')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('serviceFlyoutSection-infrastructureMetrics-error')
    ).not.toBeInTheDocument();
  });
});
