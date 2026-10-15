/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceAnomalyScoreResponse } from '@kbn/apm-api-shared';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import React from 'react';
import type { ServiceFlyoutService } from '..';
import { useServiceBadges } from './service_badges';

jest.mock('@elastic/apm-rum');

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
  service = baseNodeData,
  transactionType,
  locators = { get: jest.fn() },
}: {
  service?: ServiceFlyoutService;
  transactionType?: string;
  locators?: { get: jest.Mock };
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

function setupLinks({ slosHref = '/app/slos/slos-href' }: { slosHref?: string } = {}) {
  mockUseServiceFlyoutLinks.mockReturnValue({
    apm: { overviewTab: '/app/apm/services/opbeans-java/overview' },
    alerts: undefined,
    slos: slosHref,
    discover: { traces: { href: undefined }, logs: { href: undefined } },
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
  return renderHook(() => useServiceBadges());
}

function findBadge(badges: ReactElement[], dataTestSubj: string): ReactElement | undefined {
  return badges.find((badge) => badge.props['data-test-subj'] === dataTestSubj);
}

describe('useServiceBadges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupLinks();
  });

  it('always renders the service badge', () => {
    setupContext();
    setupBadgesData();
    const { result } = renderBadges();
    expect(findBadge(result.current, 'serviceFlyoutServiceBadge')).toBeDefined();
  });

  describe('alerts badge', () => {
    it('shows the alerts count and renders a link to the alerts tab', () => {
      const mockGetRedirectUrl = jest.fn().mockReturnValue('/app/apm/services/opbeans-java/alerts');
      setupContext({
        locators: { get: jest.fn().mockReturnValue({ getRedirectUrl: mockGetRedirectUrl }) },
      });
      setupBadgesData({ alertsCount: 3 });
      const { result } = renderBadges();

      const badge = findBadge(result.current, 'serviceFlyoutAlertsBadge');
      expect(badge?.props.children).toBe(3);
      expect(badge?.props.href).toBe('/app/apm/services/opbeans-java/alerts');
      expect(badge?.props['data-ebt-action']).toBe('viewAlerts');
      expect(badge?.props['data-ebt-element']).toBe('serviceFlyoutAlertsBadge');
      expect(mockGetRedirectUrl).toHaveBeenCalledWith(
        expect.objectContaining({ serviceOverviewTab: 'alerts' })
      );
    });

    it('hides the alerts badge when the hook returns no count', () => {
      setupContext();
      setupBadgesData({ alertsCount: undefined });
      const { result } = renderBadges();

      expect(findBadge(result.current, 'serviceFlyoutAlertsBadge')).toBeUndefined();
    });
  });

  describe('SLO badge', () => {
    it('shows the SLO badge and navigates to the SLO list on click', () => {
      setupContext();
      setupBadgesData({ sloData: { sloStatus: 'violated', sloCount: 2 } });
      const { result } = renderBadges();

      const badge = findBadge(result.current, 'serviceFlyoutSloBadge');
      expect(badge?.props['data-slo-status']).toBe('violated');
      expect(badge?.props['data-ebt-action']).toBe('viewSlos');
      expect(badge?.props['data-ebt-element']).toBe('serviceFlyoutSloBadge');

      badge?.props.onClick({ preventDefault: jest.fn() });
      expect(mockNavigateToUrl).toHaveBeenCalledWith('/app/slos/slos-href');
    });

    it('shows the "No SLOs" badge when the hook resolves with no SLOs', () => {
      setupContext();
      setupBadgesData({ sloData: { sloStatus: 'noSLOs', sloCount: 0 } });
      const { result } = renderBadges();

      const badge = findBadge(result.current, 'serviceFlyoutSloBadge');
      expect(badge).toBeDefined();
      expect(badge?.props['data-slo-status']).toBe('noSLOs');
    });

    it('hides the SLO badge when the hook returns no sloData', () => {
      setupContext();
      setupBadgesData({ sloData: undefined });
      const { result } = renderBadges();

      expect(findBadge(result.current, 'serviceFlyoutSloBadge')).toBeUndefined();
    });
  });

  describe('anomaly badge', () => {
    it('shows the anomaly badge when the hook returns a score', () => {
      setupContext();
      setupBadgesData({ anomalyData: { anomalyScore: 75, anomalyEnvironment: 'production' } });
      const { result } = renderBadges();

      expect(findBadge(result.current, 'serviceFlyoutAnomaliesBadge')).toBeDefined();
    });

    it('hides the anomaly badge when the hook returns no score', () => {
      setupContext();
      setupBadgesData({ anomalyData: undefined });
      const { result } = renderBadges();

      expect(findBadge(result.current, 'serviceFlyoutAnomaliesBadge')).toBeUndefined();
    });

    it('passes transactionType from context to the anomaly badge navigation link', async () => {
      const mockGetUrl = jest.fn().mockResolvedValue('/app/apm/services/opbeans-java/overview');
      const mockGetRedirectUrl = jest
        .fn()
        .mockReturnValue('/app/r?l=APM_LOCATOR&lz=compressed-payload');
      setupContext({
        transactionType: 'request',
        locators: {
          get: jest.fn().mockReturnValue({
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

function BadgesInTemplate() {
  const badges = useServiceBadges();
  return (
    <FlyoutTemplate onClose={jest.fn()} session="never">
      <FlyoutTemplate.Header title="opbeans-java">{badges}</FlyoutTemplate.Header>
      <FlyoutTemplate.Body>content</FlyoutTemplate.Body>
    </FlyoutTemplate>
  );
}

describe('useServiceBadges in FlyoutTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupLinks();
  });

  it('renders display-only badges as labelled, focusable tooltip anchors', async () => {
    setupContext();
    setupBadgesData({
      alertsCount: 3,
      anomalyData: { anomalyScore: 0, anomalyEnvironment: 'production' },
    });
    render(
      <IntlProvider locale="en">
        <BadgesInTemplate />
      </IntlProvider>
    );

    const alertsBadge = screen.getByTestId('serviceFlyoutAlertsBadge');
    expect(alertsBadge).toHaveAttribute('role', 'img');
    expect(alertsBadge).toHaveAttribute('tabindex', '0');
    expect(alertsBadge).toHaveAttribute('aria-label', expect.stringContaining('opbeans-java'));

    const anomalyBadge = screen.getByTestId('serviceFlyoutAnomaliesBadge');
    expect(anomalyBadge).toHaveAttribute('role', 'img');
    expect(anomalyBadge).toHaveAttribute('tabindex', '0');

    act(() => anomalyBadge.focus());

    expect(await screen.findByRole('tooltip')).toHaveTextContent('No anomalies detected.');
  });
});
