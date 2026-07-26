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

jest.mock('../../../../hooks/use_adhoc_apm_data_view', () => ({
  useAdHocApmDataView: () => ({ dataView: undefined }),
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
});
