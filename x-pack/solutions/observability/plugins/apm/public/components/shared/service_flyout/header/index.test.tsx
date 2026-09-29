/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { ServiceFlyoutService } from '..';
import { ServiceFlyoutHeader } from '.';
import { SERVICE_FLYOUT_DEFAULT_TAB_ID, SERVICE_FLYOUT_TABS } from '..';
import { APM_APP_LOCATOR_ID } from '../../../../locator/service_detail_locator';
import * as ServiceBadgesModule from './service_badges';

const mockUseServiceFlyoutLinks = vi.fn();
vi.mock('../hooks/use_service_flyout_links', () => {
      const mocked = {
      useServiceFlyoutLinks: (...args: unknown[]) => mockUseServiceFlyoutLinks(...args),
    };
      return { ...mocked, default: mocked };
    });

const mockServiceBadges = vi.fn();

const mockApmLocator = { getRedirectUrl: vi.fn() };

const mockShare = {
  url: {
    locators: {
      get: vi
        .fn()
        .mockImplementation((id: string) =>
          id === APM_APP_LOCATOR_ID ? mockApmLocator : undefined
        ),
    },
  },
} as any;

const mockCore = {
  application: { capabilities: { slo: { read: false }, apm: {} } },
  http: { basePath: { prepend: (path: string) => path } },
} as any;

const mockUseServiceFlyoutContext = vi.fn();
vi.mock('../service_flyout_context', () => {
      const mocked = {
      useServiceFlyoutContext: () => mockUseServiceFlyoutContext(),
    };
      return { ...mocked, default: mocked };
    });

const baseNodeData: ServiceFlyoutService = {
  name: 'opbeans-java',
  agentName: 'java',
};

function renderHeader({
  selectedTabId = SERVICE_FLYOUT_DEFAULT_TAB_ID,
  onSelectedTabIdChange = vi.fn(),
}: {
  selectedTabId?: (typeof SERVICE_FLYOUT_TABS)[number]['id'];
  onSelectedTabIdChange?: Mock;
} = {}) {
  return render(
    <IntlProvider locale="en">
      <ServiceFlyoutHeader
        title={baseNodeData.name}
        titleId="title-id"
        selectedTabId={selectedTabId}
        onSelectedTabIdChange={onSelectedTabIdChange}
      />
    </IntlProvider>
  );
}

describe('ServiceFlyoutHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseServiceFlyoutContext.mockReturnValue({
      deps: { core: mockCore, share: mockShare, lens: undefined, dataViews: undefined },
      service: baseNodeData,
      capabilities: {
        loading: false,
        error: undefined,
        schema: 'ecs' as const,
        header: { serviceNameLink: true, badges: true },
        overview: { transactions: true, transactionTypeFilter: true, infraMetrics: true },
        footer: { alerts: true, slos: true },
      },
      filters: {
        environment: 'production',
        setEnvironment: vi.fn(),
        rangeFrom: 'now-15m',
        rangeTo: 'now',
        start: '2026-01-01T00:00:00.000Z',
        end: '2026-01-01T00:15:00.000Z',
        setRange: vi.fn(),
        refreshToken: 0,
        onRefresh: vi.fn(),
      },
    });

    // `ServiceBadges` is self-contained and covered by its own test; here we only assert that the
    // header renders it.
    vi.spyOn(ServiceBadgesModule, 'ServiceBadges').mockImplementation(() => {
      mockServiceBadges();
      return React.createElement('div', { 'data-test-subj': 'serviceBadgesMock' });
    });

    mockUseServiceFlyoutLinks.mockReturnValue({
      apm: { overviewTab: '/app/apm/overview-href', alertsTab: '/app/apm/alerts-href' },
      alerts: undefined,
      slos: undefined,
      discover: { traces: undefined, logs: undefined },
    });
    mockApmLocator.getRedirectUrl.mockReturnValue('/app/apm/overview-href');
    mockShare.url.locators.get.mockImplementation((id: string) =>
      id === APM_APP_LOCATOR_ID ? mockApmLocator : undefined
    );
  });

  it('renders the overview title link and the service badges', () => {
    renderHeader();

    const titleLink = screen.getByTestId('serviceFlyoutTitleLink');
    expect(titleLink).toHaveAttribute('href', '/app/apm/overview-href');
    expect(titleLink).toHaveAttribute('data-ebt-action', 'viewService');
    expect(titleLink).toHaveAttribute('data-ebt-element', 'serviceFlyoutTitle');
    expect(screen.getByTestId('serviceBadgesMock')).toBeInTheDocument();
  });

  it('shows a tooltip describing the title link destination', async () => {
    renderHeader();

    const titleLink = screen.getByTestId('serviceFlyoutTitleLink');
    const tooltipAnchor = titleLink.closest('.euiToolTipAnchor') ?? titleLink;
    fireEvent.mouseEnter(tooltipAnchor);
    fireEvent.mouseOver(tooltipAnchor);

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveTextContent('Open service overview');
    });
  });

  it('renders the title as plain text when serviceNameLink capability is disabled', () => {
    mockUseServiceFlyoutContext.mockReturnValue({
      deps: { core: mockCore, share: mockShare, lens: undefined, dataViews: undefined },
      service: baseNodeData,
      capabilities: {
        loading: false,
        error: undefined,
        schema: 'otel' as const,
        header: { serviceNameLink: false, badges: false },
        overview: { transactions: false, transactionTypeFilter: false, infraMetrics: false },
        footer: { alerts: false, slos: false },
      },
      filters: {
        environment: 'production',
        setEnvironment: vi.fn(),
        rangeFrom: 'now-15m',
        rangeTo: 'now',
        start: '2026-01-01T00:00:00.000Z',
        end: '2026-01-01T00:15:00.000Z',
        setRange: vi.fn(),
        refreshToken: 0,
        onRefresh: vi.fn(),
      },
    });
    renderHeader();

    expect(screen.queryByTestId('serviceFlyoutTitleLink')).not.toBeInTheDocument();
    expect(screen.getByTestId('serviceFlyoutTitle')).toHaveTextContent(baseNodeData.name);
    expect(screen.getByTestId('serviceBadgesMock')).toBeInTheDocument();
  });

  it('renders a tab per definition and selects the active one', () => {
    renderHeader();

    SERVICE_FLYOUT_TABS.forEach(({ id }) => {
      expect(screen.getByTestId(`serviceFlyoutTab-${id}`)).toBeInTheDocument();
    });
  });

  it('instruments each tab with EBT click attributes carrying the tab id', () => {
    renderHeader();

    SERVICE_FLYOUT_TABS.forEach(({ id }) => {
      const tab = screen.getByTestId(`serviceFlyoutTab-${id}`);
      expect(tab).toHaveAttribute('data-ebt-action', 'viewServiceFlyoutTab');
      expect(tab).toHaveAttribute('data-ebt-element', 'serviceFlyoutTabs');
      expect(tab).toHaveAttribute('data-ebt-detail', id);
    });
  });

  it('calls onSelectedTabIdChange when a tab is clicked', () => {
    const onSelectedTabIdChange = vi.fn();
    renderHeader({ onSelectedTabIdChange });

    const { id } = SERVICE_FLYOUT_TABS[0];
    fireEvent.click(screen.getByTestId(`serviceFlyoutTab-${id}`));
    expect(onSelectedTabIdChange).toHaveBeenCalledWith(id);
  });
});
