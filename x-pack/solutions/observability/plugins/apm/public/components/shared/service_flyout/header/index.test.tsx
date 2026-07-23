/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { ServiceFlyoutService } from '..';
import { ServiceFlyoutHeader } from '.';
import { SERVICE_FLYOUT_DEFAULT_TAB_ID, SERVICE_FLYOUT_TABS } from '..';
import { APM_APP_LOCATOR_ID } from '../../../../locator/service_detail_locator';
import * as ServiceBadgesModule from './service_badges';

const mockUseServiceFlyoutLinks = jest.fn();
jest.mock('../hooks/use_service_flyout_links', () => ({
  useServiceFlyoutLinks: (...args: unknown[]) => mockUseServiceFlyoutLinks(...args),
}));

const mockServiceBadges = jest.fn();

const mockApmLocator = { getRedirectUrl: jest.fn() };

const mockShare = {
  url: {
    locators: {
      get: jest
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

const mockUseServiceFlyoutContext = jest.fn();
jest.mock('../service_flyout_context', () => ({
  useServiceFlyoutContext: () => mockUseServiceFlyoutContext(),
}));

const baseNodeData: ServiceFlyoutService = {
  name: 'opbeans-java',
  agentName: 'java',
};

function renderHeader({
  selectedTabId = SERVICE_FLYOUT_DEFAULT_TAB_ID,
  onSelectedTabIdChange = jest.fn(),
}: {
  selectedTabId?: (typeof SERVICE_FLYOUT_TABS)[number]['id'];
  onSelectedTabIdChange?: jest.Mock;
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
    jest.clearAllMocks();

    mockUseServiceFlyoutContext.mockReturnValue({
      deps: { core: mockCore, share: mockShare, lens: undefined, dataViews: undefined },
      service: baseNodeData,
      filters: {
        environment: 'production',
        setEnvironment: jest.fn(),
        rangeFrom: 'now-15m',
        rangeTo: 'now',
        setRange: jest.fn(),
        refreshToken: 0,
        onRefresh: jest.fn(),
      },
    });

    // `ServiceBadges` is self-contained and covered by its own test; here we only assert that the
    // header renders it.
    jest.spyOn(ServiceBadgesModule, 'ServiceBadges').mockImplementation(() => {
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
    const onSelectedTabIdChange = jest.fn();
    renderHeader({ onSelectedTabIdChange });

    const { id } = SERVICE_FLYOUT_TABS[0];
    fireEvent.click(screen.getByTestId(`serviceFlyoutTab-${id}`));
    expect(onSelectedTabIdChange).toHaveBeenCalledWith(id);
  });
});
