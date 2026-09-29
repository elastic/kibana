/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import type { ServiceAnomalyScoreResponse } from '@kbn/apm-api-shared';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { ServiceFlyoutService } from '..';
import { ServiceBadges } from './service_badges';

const mockNavigateToUrl = vi.fn();
const mockUseServiceFlyoutContext = vi.fn();
vi.mock('../service_flyout_context', () => {
      const mocked = {
      useServiceFlyoutContext: () => mockUseServiceFlyoutContext(),
    };
      return { ...mocked, default: mocked };
    });

const mockUseServiceBadgesData = vi.fn();
vi.mock('../hooks/use_service_badges_data', () => {
      const mocked = {
      useServiceBadgesData: (...args: unknown[]) => mockUseServiceBadgesData(...args),
    };
      return { ...mocked, default: mocked };
    });

const mockUseServiceFlyoutLinks = vi.fn();
vi.mock('../hooks/use_service_flyout_links', () => {
      const mocked = {
      useServiceFlyoutLinks: (...args: unknown[]) => mockUseServiceFlyoutLinks(...args),
    };
      return { ...mocked, default: mocked };
    });

const baseNodeData: ServiceFlyoutService = {
  name: 'opbeans-java',
  agentName: 'java',
};

function setupContext({
  service = baseNodeData,
  transactionType,
  locators = { get: vi.fn() },
}: {
  service?: ServiceFlyoutService;
  transactionType?: string;
  locators?: { get: Mock };
} = {}) {
  mockUseServiceFlyoutContext.mockReturnValue({
    deps: {
      core: {
        application: {
          navigateToUrl: mockNavigateToUrl,
          capabilities: {},
        },
        http: { basePath: { prepend: (path: string) => path } },
      },
      share: { url: { locators } },
    },
    service,
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
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      transactionType,
    },
  });
}

function setupLinks({
  alertsHref = '/app/apm/services/opbeans-java/alerts',
  slosHref = '/app/slos/slos-href',
}: { alertsHref?: string; slosHref?: string } = {}) {
  mockUseServiceFlyoutLinks.mockReturnValue({
    apm: { overview: '/app/apm/services/opbeans-java/overview', alertsTab: alertsHref },
    alerts: undefined,
    slos: slosHref,
    discover: { traces: undefined, logs: undefined },
  });
}

function setupBadgesData({
  alertsCount,
  anomalyData,
  sloData,
}: {
  alertsCount?: number;
  anomalyData?: ServiceAnomalyScoreResponse;
  sloData?: { sloStatus: string; sloCount: number };
} = {}) {
  mockUseServiceBadgesData.mockReturnValue({ alertsCount, anomalyData, sloData });
}

function renderBadges() {
  return render(
    <IntlProvider locale="en">
      <ServiceBadges />
    </IntlProvider>
  );
}

describe('ServiceBadges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupLinks();
  });

  it('always renders the service badge', () => {
    setupContext();
    setupBadgesData();
    renderBadges();
    expect(screen.getByTestId('serviceFlyoutServiceBadge')).toBeInTheDocument();
  });

  describe('alerts badge', () => {
    it('shows the alerts count and renders a link to the alerts tab', () => {
      const mockGetRedirectUrl = vi.fn().mockReturnValue('/app/apm/services/opbeans-java/alerts');
      setupContext({
        locators: { get: vi.fn().mockReturnValue({ getRedirectUrl: mockGetRedirectUrl }) },
      });
      setupBadgesData({ alertsCount: 3 });
      renderBadges();

      const badge = screen.getByTestId('serviceFlyoutAlertsBadge');
      expect(badge).toHaveTextContent('3');
      expect(badge).toHaveAttribute('data-ebt-action', 'viewAlerts');
      expect(badge).toHaveAttribute('data-ebt-element', 'serviceFlyoutAlertsBadge');
      expect(mockGetRedirectUrl).toHaveBeenCalledWith(
        expect.objectContaining({ serviceOverviewTab: 'alerts' })
      );
    });

    it('hides the alerts badge when the hook returns no count', () => {
      setupContext();
      setupBadgesData({ alertsCount: undefined });
      renderBadges();

      expect(screen.queryByTestId('serviceFlyoutAlertsBadge')).not.toBeInTheDocument();
    });
  });

  describe('SLO badge', () => {
    it('shows the SLO badge and navigates to the SLO list on click', () => {
      setupContext();
      setupBadgesData({ sloData: { sloStatus: 'violated', sloCount: 2 } });
      renderBadges();

      const badge = screen.getByTestId('apmSloBadge');
      expect(badge).toHaveAttribute('data-slo-status', 'violated');
      expect(badge).toHaveAttribute('data-ebt-action', 'viewSlos');
      expect(badge).toHaveAttribute('data-ebt-element', 'serviceFlyoutSloBadge');

      fireEvent.click(badge);
      expect(mockNavigateToUrl).toHaveBeenCalledWith('/app/slos/slos-href');
    });

    it('shows the "No SLOs" badge when the hook resolves with no SLOs', () => {
      setupContext();
      setupBadgesData({ sloData: { sloStatus: 'noSLOs', sloCount: 0 } });
      renderBadges();

      const badge = screen.getByTestId('apmSloBadge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('data-slo-status', 'noSLOs');
    });

    it('hides the SLO badge when the hook returns no sloData', () => {
      setupContext();
      setupBadgesData({ sloData: undefined });
      renderBadges();

      expect(screen.queryByTestId('apmSloBadge')).not.toBeInTheDocument();
    });
  });

  describe('anomaly badge', () => {
    it('shows the anomaly badge when the hook returns a score', () => {
      setupContext();
      setupBadgesData({ anomalyData: { anomalyScore: 75, anomalyEnvironment: 'production' } });
      renderBadges();

      expect(screen.getByTestId('serviceFlyoutAnomaliesBadge')).toBeInTheDocument();
    });

    it('hides the anomaly badge when the hook returns no score', () => {
      setupContext();
      setupBadgesData({ anomalyData: undefined });
      renderBadges();

      expect(screen.queryByTestId('serviceFlyoutAnomaliesBadge')).not.toBeInTheDocument();
    });

    it('passes transactionType from context to the anomaly badge navigation link', async () => {
      const mockGetUrl = vi.fn().mockResolvedValue('/app/apm/services/opbeans-java/overview');
      const mockGetRedirectUrl = vi
        .fn()
        .mockReturnValue('/app/r?l=APM_LOCATOR&lz=compressed-payload');
      setupContext({
        transactionType: 'request',
        locators: {
          get: vi.fn().mockReturnValue({
            getUrl: mockGetUrl,
            getRedirectUrl: mockGetRedirectUrl,
          }),
        },
      });
      setupBadgesData({ anomalyData: { anomalyScore: 75, anomalyEnvironment: 'production' } });
      renderBadges();

      await waitFor(() => {
        expect(mockGetUrl).toHaveBeenCalledWith(
          expect.objectContaining({
            query: expect.objectContaining({ transactionType: 'request' }),
          }),
          undefined
        );
      });
      expect(mockGetRedirectUrl).not.toHaveBeenCalled();
    });
  });
});
