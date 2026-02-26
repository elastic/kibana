/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ServiceHeaderBadges } from './service_header_badges';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';

const mockUseServiceSloContext = jest.fn();
jest.mock('../../../../context/service_slo/use_service_slo_context', () => ({
  useServiceSloContext: () => mockUseServiceSloContext(),
}));

const mockUseApmPluginContext = jest.fn();
jest.mock('../../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: () => mockUseApmPluginContext(),
}));

const mockUseFetcher = jest.fn();
jest.mock('../../../../hooks/use_fetcher', () => ({
  useFetcher: () => mockUseFetcher(),
  FETCH_STATUS: {
    LOADING: 'loading',
    SUCCESS: 'success',
    FAILURE: 'failure',
    NOT_INITIATED: 'not_initiated',
  },
}));

const defaultProps = {
  serviceName: 'test-service',
  environment: 'production',
  start: '2026-01-01T00:00:00.000Z',
  end: '2026-01-02T00:00:00.000Z',
  onSloClick: jest.fn(),
  alertsTabHref: '/services/test-service/alerts',
};

function renderBadges(props = defaultProps) {
  return render(
    <IntlProvider locale="en">
      <ServiceHeaderBadges {...props} />
    </IntlProvider>
  );
}

function setupMocks({
  isAlertingAvailable = true,
  canReadAlerts = true,
  canReadSlos = true,
  alertsCount = 0,
  sloFetchStatus = FETCH_STATUS.SUCCESS as string,
  mostCriticalSloStatus = { status: 'healthy' as const, count: 0 },
}: {
  isAlertingAvailable?: boolean;
  canReadAlerts?: boolean;
  canReadSlos?: boolean;
  alertsCount?: number;
  sloFetchStatus?: string;
  mostCriticalSloStatus?: { status: string; count: number };
} = {}) {
  mockUseApmPluginContext.mockReturnValue({
    core: {
      application: {
        capabilities: {
          slo: { read: canReadSlos },
          apm: {
            'alerting:show': canReadAlerts,
            'alerting:save': canReadAlerts,
          },
        },
      },
    },
    plugins: {
      alerting: isAlertingAvailable ? {} : undefined,
    },
  });

  mockUseServiceSloContext.mockReturnValue({
    mostCriticalSloStatus,
    sloFetchStatus,
  });

  mockUseFetcher.mockReturnValue({
    data: { alertsCount },
    status: FETCH_STATUS.SUCCESS,
  });
}

describe('ServiceHeaderBadges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows alerts badge when there are active alerts', () => {
    setupMocks({ alertsCount: 5 });
    renderBadges();

    const badge = screen.getByTestId('serviceHeaderAlertsBadge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('5');
  });

  it('shows alerts badge with correct href', () => {
    setupMocks({ alertsCount: 3 });
    renderBadges();

    const badge = screen.getByTestId('serviceHeaderAlertsBadge');
    expect(badge).toHaveAttribute('href', '/services/test-service/alerts');
  });

  it('hides alerts badge when alertsCount is 0', () => {
    setupMocks({ alertsCount: 0, mostCriticalSloStatus: { status: 'healthy', count: 1 } });
    renderBadges();

    expect(screen.queryByTestId('serviceHeaderAlertsBadge')).not.toBeInTheDocument();
  });

  it('hides alerts badge when alerting is unavailable', () => {
    setupMocks({ isAlertingAvailable: false, alertsCount: 5 });
    renderBadges();

    expect(screen.queryByTestId('serviceHeaderAlertsBadge')).not.toBeInTheDocument();
  });

  it('shows violated SLO badge when SLOs are violated', () => {
    setupMocks({ mostCriticalSloStatus: { status: 'violated', count: 2 } });
    renderBadges();

    expect(screen.getByTestId('serviceInventorySloViolatedBadge')).toBeInTheDocument();
  });

  it('shows healthy SLO badge', () => {
    setupMocks({ mostCriticalSloStatus: { status: 'healthy', count: 3 } });
    renderBadges();

    expect(screen.getByTestId('serviceInventorySloHealthyBadge')).toBeInTheDocument();
  });

  it('shows degrading SLO badge', () => {
    setupMocks({ mostCriticalSloStatus: { status: 'degrading', count: 1 } });
    renderBadges();

    expect(screen.getByTestId('serviceInventorySloDegradingBadge')).toBeInTheDocument();
  });

  it('hides SLO badge when SLO data is still loading', () => {
    setupMocks({ alertsCount: 1, sloFetchStatus: FETCH_STATUS.LOADING });
    renderBadges();

    expect(screen.queryByTestId('serviceInventorySloHealthyBadge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('serviceInventorySloViolatedBadge')).not.toBeInTheDocument();
  });

  it('hides SLO badge when user cannot read SLOs', () => {
    setupMocks({
      canReadSlos: false,
      alertsCount: 1,
      mostCriticalSloStatus: { status: 'violated', count: 2 },
    });
    renderBadges();

    expect(screen.queryByTestId('serviceInventorySloViolatedBadge')).not.toBeInTheDocument();
  });

  it('returns null when no badges should be shown', () => {
    setupMocks({
      alertsCount: 0,
      mostCriticalSloStatus: { status: 'noSLOs', count: 0 },
      sloFetchStatus: FETCH_STATUS.NOT_INITIATED,
    });
    const { container } = renderBadges();

    expect(container.firstChild).toBeNull();
  });

  it('shows both badges when alerts and SLO data exist', () => {
    setupMocks({
      alertsCount: 3,
      mostCriticalSloStatus: { status: 'violated', count: 1 },
    });
    renderBadges();

    expect(screen.getByTestId('serviceHeaderAlertsBadge')).toBeInTheDocument();
    expect(screen.getByTestId('serviceInventorySloViolatedBadge')).toBeInTheDocument();
  });
});
