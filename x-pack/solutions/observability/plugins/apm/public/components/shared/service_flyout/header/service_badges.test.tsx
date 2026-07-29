/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceAnomalyScoreResponse } from '@kbn/apm-api-shared';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { ServiceFlyoutService } from '..';
import { ServiceBadges } from './service_badges';

const mockNavigateToUrl = jest.fn();
const mockUseServiceFlyoutContext = jest.fn();
jest.mock('../service_flyout_context', () => ({
  useServiceFlyoutContext: () => mockUseServiceFlyoutContext(),
}));

const mockUseServiceBadgesData = jest.fn();
jest.mock('../hooks/use_service_badges_data', () => ({
  useServiceBadgesData: (...args: unknown[]) => mockUseServiceBadgesData(...args),
}));

const mockUseServiceFlyoutLinks = jest.fn();
jest.mock('../hooks/use_service_flyout_links', () => ({
  useServiceFlyoutLinks: (...args: unknown[]) => mockUseServiceFlyoutLinks(...args),
}));

const baseNodeData: ServiceFlyoutService = {
  name: 'opbeans-java',
  agentName: 'java',
};

function setupContext({
  canReadSlos = true,
  service = baseNodeData,
  transactionType,
  locators = { get: jest.fn() },
}: {
  canReadSlos?: boolean;
  service?: ServiceFlyoutService;
  transactionType?: string;
  locators?: { get: jest.Mock };
} = {}) {
  mockUseServiceFlyoutContext.mockReturnValue({
    deps: {
      core: {
        application: {
          navigateToUrl: mockNavigateToUrl,
          capabilities: { slo: { read: canReadSlos } },
        },
        http: { basePath: { prepend: (path: string) => path } },
      },
      share: { url: { locators } },
    },
    service,
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
}: { alertsCount?: number; anomalyData?: ServiceAnomalyScoreResponse } = {}) {
  mockUseServiceBadgesData.mockReturnValue({ alertsCount, anomalyData });
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
    jest.clearAllMocks();
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
      const mockGetRedirectUrl = jest.fn().mockReturnValue('/app/apm/services/opbeans-java/alerts');
      setupContext({
        locators: { get: jest.fn().mockReturnValue({ getRedirectUrl: mockGetRedirectUrl }) },
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
    it('shows the SLO badge from node data and navigates to the SLO list on click', () => {
      setupContext({ service: { ...baseNodeData, sloStatus: 'violated', sloCount: 2 } });
      setupBadgesData();
      renderBadges();

      const badge = screen.getByTestId('apmSloBadge');
      expect(badge).toHaveAttribute('data-slo-status', 'violated');
      expect(badge).toHaveAttribute('data-ebt-action', 'viewSlos');
      expect(badge).toHaveAttribute('data-ebt-element', 'serviceFlyoutSloBadge');

      fireEvent.click(badge);
      expect(mockNavigateToUrl).toHaveBeenCalledWith('/app/slos/slos-href');
    });

    it('shows the "No SLOs" badge when the node has no SLO status', () => {
      setupContext({ service: { ...baseNodeData, sloStatus: undefined } });
      setupBadgesData();
      renderBadges();

      const badge = screen.getByTestId('apmSloBadge');

      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('data-slo-status', 'noSLOs');
    });

    it('hides the SLO badge when the user cannot read SLOs', () => {
      setupContext({
        canReadSlos: false,
        service: { ...baseNodeData, sloStatus: 'violated', sloCount: 1 },
      });
      setupBadgesData();
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

    it('passes transactionType from context to the anomaly badge navigation link', () => {
      const mockGetRedirectUrl = jest
        .fn()
        .mockReturnValue('/app/apm/services/opbeans-java/overview');
      setupContext({
        transactionType: 'request',
        locators: { get: jest.fn().mockReturnValue({ getRedirectUrl: mockGetRedirectUrl }) },
      });
      setupBadgesData({ anomalyData: { anomalyScore: 75, anomalyEnvironment: 'production' } });
      renderBadges();

      expect(mockGetRedirectUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({ transactionType: 'request' }),
        })
      );
    });
  });
});
