/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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
jest.mock('../service_flyout_context', () => ({
  useServiceFlyoutContext: () => mockUseServiceFlyoutContext(),
}));

jest.mock('../hooks/use_service_has_system_metrics', () => ({
  useServiceHasSystemMetrics: () => mockUseServiceHasSystemMetrics(),
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

const service: ServiceFlyoutService = {
  name: 'opbeans-java',
  agentName: 'java',
};

function buildContextValue({ refreshToken = 0 }: { refreshToken?: number } = {}) {
  return {
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
    capabilities: {
      loading: false,
      error: undefined,
      schema: 'ecs' as const,
      header: { serviceNameLink: true, badges: true },
      overview: { transactions: true, transactionTypeFilter: true, infraMetrics: true },
      footer: { alerts: true, slos: true },
    },
    filters: {
      environment: 'production' as const,
      setEnvironment: jest.fn(),
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      setRange: jest.fn(),
      transactionType: 'request',
      setTransactionType: jest.fn(),
      refreshToken,
      onRefresh: jest.fn(),
    },
  };
}

function renderOverview({ refreshToken }: { refreshToken?: number } = {}) {
  mockUseServiceFlyoutContext.mockReturnValue(buildContextValue({ refreshToken }));
  return render(
    <IntlProvider locale="en">
      <ServiceFlyoutOverview />
    </IntlProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
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

describe('ServiceFlyoutOverview key metrics indices loading and error states', () => {
  it('renders a skeleton for key metrics while indices are loading', () => {
    mockUseServiceFlyoutContext.mockReturnValue({
      ...buildContextValue(),
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
      ...buildContextValue(),
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
      ...buildContextValue(),
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

  it('forwards refreshToken to ServiceFlyoutTransactionsSection', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue({ hasSystemMetrics: false, isLoading: false });
    renderOverview({ refreshToken: 42 });

    expect(transactionsSectionProps?.refreshToken).toBe(42);
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
