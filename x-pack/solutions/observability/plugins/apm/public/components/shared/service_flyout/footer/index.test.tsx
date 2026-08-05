/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ServiceFlyoutFooter } from '.';

const mockUseDiscoverHref = jest.fn();
jest.mock('../../links/discover_links/use_discover_href', () => ({
  useDiscoverHref: (args: unknown) => mockUseDiscoverHref(args),
}));

const mockGetManageSlosUrl = jest.fn();
jest.mock('../../../../hooks/use_manage_slos_url', () => ({
  getManageSlosUrl: (...args: unknown[]) => mockGetManageSlosUrl(...args),
}));

const mockUseAlertsHref = jest.fn();
jest.mock('./hooks/use_alerts_href', () => ({
  useAlertsHref: (...args: unknown[]) => mockUseAlertsHref(...args),
}));

const mockUseServiceFlyoutContext = jest.fn();
jest.mock('../service_flyout_context', () => ({
  useServiceFlyoutContext: () => mockUseServiceFlyoutContext(),
}));

const mockCore = {
  http: { basePath: { prepend: (path: string) => path } },
  application: { capabilities: { slo: { read: true }, apm: { 'alerting:show': true } } },
} as any;

const mockShare = {
  url: { locators: { get: jest.fn() } },
} as any;

function setupContext({ transactionType = 'request' }: { transactionType?: string } = {}) {
  mockUseServiceFlyoutContext.mockReturnValue({
    deps: { core: mockCore, share: mockShare, lens: undefined, dataViews: undefined },
    service: { name: 'opbeans-java' },
    filters: {
      environment: 'production',
      setEnvironment: jest.fn(),
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      setRange: jest.fn(),
      refreshToken: 0,
      onRefresh: jest.fn(),
      transactionType,
      setTransactionType: jest.fn(),
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
  });

  function setupAllHrefs() {
    mockUseDiscoverHref.mockImplementation(({ indexType }: { indexType: string }) =>
      indexType === 'traces' ? '/app/discover/traces' : '/app/discover/logs'
    );
    mockGetManageSlosUrl.mockReturnValue('/app/slos');
    mockUseAlertsHref.mockReturnValue(
      '/app/observability/alerts?_a=(kuery:\'service.name: "opbeans-java" AND service.environment: "production"\',rangeFrom:now-15m,rangeTo:now)'
    );
  }

  it('passes empty string transactionType to the traces Discover link before the type resolves', () => {
    setupAllHrefs();
    setupContext({ transactionType: '' });
    renderFooter();

    expect(mockUseDiscoverHref).toHaveBeenCalledWith(
      expect.objectContaining({
        indexType: 'traces',
        queryParams: expect.objectContaining({ transactionType: '' }),
      })
    );
  });

  it('scopes the Discover links to the environment and sorts by timestamp DESC', () => {
    setupAllHrefs();
    renderFooter();

    expect(mockUseDiscoverHref).toHaveBeenCalledWith(
      expect.objectContaining({
        indexType: 'traces',
        queryParams: {
          serviceName: 'opbeans-java',
          transactionType: 'request',
          environment: 'production',
          sortDirection: 'DESC',
        },
      })
    );

    // Logs (error index) is scoped to the environment and sorted, but not by transaction type.
    expect(mockUseDiscoverHref).toHaveBeenCalledWith(
      expect.objectContaining({
        indexType: 'error',
        queryParams: {
          serviceName: 'opbeans-java',
          environment: 'production',
          sortDirection: 'DESC',
        },
      })
    );

    const logsCall = mockUseDiscoverHref.mock.calls.find(
      ([args]: [{ indexType: string }]) => args.indexType === 'error'
    );
    expect(logsCall?.[0].queryParams).not.toHaveProperty('transactionType');
  });

  it('enables the actions button and renders all action items when hrefs resolve', () => {
    setupAllHrefs();
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
    expect(logsAction).toHaveAttribute('data-ebt-element', 'serviceFlyoutActionsMenu');
    expect(logsAction).toHaveAttribute('data-ebt-detail', 'logs');

    const alertsAction = screen.getByTestId('serviceFlyoutActionsMenuItem-openAlerts');
    expect(alertsAction).toHaveAttribute(
      'href',
      expect.stringContaining('/app/observability/alerts')
    );
    const alertsHref = alertsAction.getAttribute('href') ?? '';
    expect(alertsHref).toContain('opbeans-java');
    expect(alertsHref).toContain('service.environment');
    expect(alertsHref).toContain('production');
    expect(alertsAction).toHaveAttribute('data-ebt-action', 'viewAlerts');
    expect(alertsAction).toHaveAttribute('data-ebt-element', 'serviceFlyoutActionsMenu');

    const slosAction = screen.getByTestId('serviceFlyoutActionsMenuItem-openSlos');
    expect(slosAction).toHaveAttribute('href', '/app/slos');
    expect(slosAction).toHaveAttribute('data-ebt-action', 'viewSlos');
    expect(slosAction).toHaveAttribute('data-ebt-element', 'serviceFlyoutActionsMenu');
  });

  it('renders the Alerts and SLOs group labels', () => {
    setupAllHrefs();
    renderFooter();
    openActionsMenu();

    expect(screen.getByTestId('serviceFlyoutActionsMenuGroup-alerts')).toBeInTheDocument();
    expect(screen.getByTestId('serviceFlyoutActionsMenuGroup-slos')).toBeInTheDocument();
  });

  it('omits the alerts action when the alerts href is not available', () => {
    setupAllHrefs();
    mockUseAlertsHref.mockReturnValue(undefined);
    renderFooter();

    openActionsMenu();

    expect(screen.queryByTestId('serviceFlyoutActionsMenuItem-openAlerts')).not.toBeInTheDocument();
    expect(
      screen.getByTestId('serviceFlyoutActionsMenuItem-openTracesInDiscover')
    ).toBeInTheDocument();
  });

  it('omits the Discover actions when no Discover hrefs resolve', () => {
    setupAllHrefs();
    mockUseDiscoverHref.mockReturnValue(undefined);
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

  it('disables the actions button when no hrefs resolve', () => {
    mockUseDiscoverHref.mockReturnValue(undefined);
    mockGetManageSlosUrl.mockReturnValue(undefined);
    mockUseAlertsHref.mockReturnValue(undefined);
    renderFooter();

    expect(screen.getByTestId('serviceFlyoutActionsButton')).toBeDisabled();
  });
});
