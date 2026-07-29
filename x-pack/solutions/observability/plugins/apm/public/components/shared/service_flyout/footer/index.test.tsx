/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ServiceFlyoutFooter } from '.';

const mockUseServiceFlyoutLinks = jest.fn();
jest.mock('../hooks/use_service_flyout_links', () => ({
  useServiceFlyoutLinks: () => mockUseServiceFlyoutLinks(),
}));

const mockUseServiceFlyoutContext = jest.fn();
jest.mock('../service_flyout_context', () => ({
  useServiceFlyoutContext: () => mockUseServiceFlyoutContext(),
}));

function makeLinks({
  tracesHref = '/app/discover/traces',
  logsHref = '/app/discover/logs',
  alertsHref = '/app/observability/alerts?mock',
  slosHref = '/app/slos?serviceName=opbeans-java',
  tracesOpenInDiscoverTab = undefined as (() => void) | undefined,
  logsOpenInDiscoverTab = undefined as (() => void) | undefined,
} = {}) {
  return {
    apm: {
      overviewTab: '/app/apm/services/opbeans-java/overview',
      alertsTab: '/app/apm/services/opbeans-java/alerts',
    },
    alerts: alertsHref,
    slos: slosHref,
    discover: {
      traces: { href: tracesHref, openInDiscoverTab: tracesOpenInDiscoverTab },
      logs: { href: logsHref, openInDiscoverTab: logsOpenInDiscoverTab },
    },
  };
}

function makeCapabilities({ alerts = true, slos = true } = {}) {
  return {
    loading: false,
    error: undefined,
    schema: 'ecs' as const,
    header: { serviceNameLink: true, badges: true },
    overview: { transactions: true, transactionTypeFilter: true, infraMetrics: true },
    footer: { alerts, slos },
  };
}

function setupContext({ alerts = true, slos = true } = {}) {
  mockUseServiceFlyoutContext.mockReturnValue({
    deps: {},
    service: { name: 'opbeans-java' },
    capabilities: makeCapabilities({ alerts, slos }),
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
}

function renderFooter() {
  return render(
    <IntlProvider locale="en">
      <ServiceFlyoutFooter />
    </IntlProvider>
  );
}

function openActionsMenu() {
  fireEvent.click(screen.getByTestId('serviceFlyoutActionsButton'));
}

describe('ServiceFlyoutFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupContext();
    mockUseServiceFlyoutLinks.mockReturnValue(makeLinks());
  });

  afterEach(() => {
    cleanup();
  });

  it('enables the actions button and renders all action items when hrefs resolve', () => {
    renderFooter();

    const button = screen.getByTestId('serviceFlyoutActionsButton');
    expect(button).not.toBeDisabled();

    openActionsMenu();

    const tracesAction = screen.getByTestId('serviceFlyoutActionsMenuItem-openTracesInDiscover');
    expect(tracesAction).toHaveAttribute('href', '/app/discover/traces');
    expect(tracesAction).toHaveAttribute('data-ebt-action', 'openInDiscover');
    expect(tracesAction).toHaveAttribute('data-ebt-element', 'serviceFlyoutActionsMenu');
    expect(tracesAction).toHaveAttribute('data-ebt-detail', 'traces');

    const logsAction = screen.getByTestId('serviceFlyoutActionsMenuItem-openLogsInDiscover');
    expect(logsAction).toHaveAttribute('href', '/app/discover/logs');
    expect(logsAction).toHaveAttribute('data-ebt-action', 'openInDiscover');
    expect(logsAction).toHaveAttribute('data-ebt-detail', 'logs');

    const alertsAction = screen.getByTestId('serviceFlyoutActionsMenuItem-openAlerts');
    expect(alertsAction).toHaveAttribute(
      'href',
      expect.stringContaining('/app/observability/alerts')
    );

    const slosAction = screen.getByTestId('serviceFlyoutActionsMenuItem-openSlos');
    expect(slosAction).toHaveAttribute('href', '/app/slos?serviceName=opbeans-java');
  });

  it('renders the Alerts and SLOs group labels', () => {
    renderFooter();
    openActionsMenu();

    expect(screen.getByTestId('serviceFlyoutActionsMenuGroup-alerts')).toBeInTheDocument();
    expect(screen.getByTestId('serviceFlyoutActionsMenuGroup-slos')).toBeInTheDocument();
  });

  it('omits the alerts action when the alerts href is not available', () => {
    mockUseServiceFlyoutLinks.mockReturnValue({ ...makeLinks(), alerts: undefined });
    renderFooter();
    openActionsMenu();

    expect(screen.queryByTestId('serviceFlyoutActionsMenuItem-openAlerts')).not.toBeInTheDocument();
    expect(
      screen.getByTestId('serviceFlyoutActionsMenuItem-openTracesInDiscover')
    ).toBeInTheDocument();
  });

  it('omits the Discover actions when no Discover hrefs resolve', () => {
    mockUseServiceFlyoutLinks.mockReturnValue({
      ...makeLinks(),
      discover: {
        traces: { href: undefined, openInDiscoverTab: undefined },
        logs: { href: undefined, openInDiscoverTab: undefined },
      },
    });
    renderFooter();
    openActionsMenu();

    expect(
      screen.queryByTestId('serviceFlyoutActionsMenuItem-openTracesInDiscover')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('serviceFlyoutActionsMenuItem-openLogsInDiscover')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('serviceFlyoutActionsMenuItem-openAlerts')).toBeInTheDocument();
  });

  it('shows the actions button disabled while capabilities are loading', () => {
    mockUseServiceFlyoutContext.mockReturnValue({
      deps: {},
      service: { name: 'opbeans-java' },
      capabilities: { ...makeCapabilities(), loading: true },
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
    renderFooter();

    expect(screen.getByTestId('serviceFlyoutActionsButton')).toBeDisabled();
  });

  it('disables the actions button when no actions are available', () => {
    mockUseServiceFlyoutLinks.mockReturnValue({
      ...makeLinks(),
      alerts: undefined,
      slos: undefined,
      discover: {
        traces: { href: undefined, openInDiscoverTab: undefined },
        logs: { href: undefined, openInDiscoverTab: undefined },
      },
    });
    renderFooter();

    expect(screen.getByTestId('serviceFlyoutActionsButton')).toBeDisabled();
  });

  it('hides alerts and SLOs actions when capabilities disable them', () => {
    setupContext({ alerts: false, slos: false });
    renderFooter();
    openActionsMenu();

    expect(screen.queryByTestId('serviceFlyoutActionsMenuItem-openAlerts')).not.toBeInTheDocument();
    expect(screen.queryByTestId('serviceFlyoutActionsMenuItem-openSlos')).not.toBeInTheDocument();
    expect(
      screen.getByTestId('serviceFlyoutActionsMenuItem-openTracesInDiscover')
    ).toBeInTheDocument();
  });

  describe('when openInDiscoverTab is provided', () => {
    it('shows "Open traces in a Discover tab" label for traces', () => {
      mockUseServiceFlyoutLinks.mockReturnValue(makeLinks({ tracesOpenInDiscoverTab: jest.fn() }));
      renderFooter();
      openActionsMenu();

      expect(
        screen.getByTestId('serviceFlyoutActionsMenuItem-openTracesInDiscover')
      ).toHaveTextContent('Open traces in a Discover tab');
    });

    it('shows "Open traces in Discover" label when openInDiscoverTab is not provided', () => {
      renderFooter();
      openActionsMenu();

      expect(
        screen.getByTestId('serviceFlyoutActionsMenuItem-openTracesInDiscover')
      ).toHaveTextContent('Open traces in Discover');
    });

    it('calls openInDiscoverTab when the traces action is clicked', () => {
      const mockOpenInDiscoverTab = jest.fn();
      mockUseServiceFlyoutLinks.mockReturnValue(
        makeLinks({ tracesOpenInDiscoverTab: mockOpenInDiscoverTab })
      );
      renderFooter();
      openActionsMenu();

      fireEvent.click(screen.getByTestId('serviceFlyoutActionsMenuItem-openTracesInDiscover'));

      expect(mockOpenInDiscoverTab).toHaveBeenCalledTimes(1);
    });
  });
});
