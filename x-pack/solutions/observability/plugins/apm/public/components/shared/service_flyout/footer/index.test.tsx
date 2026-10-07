/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlyoutFooterMenuItem } from '@kbn/flyout-template';
import { renderHook } from '@testing-library/react';
import type { MouseEvent } from 'react';
import { useServiceFlyoutFooterMenu } from '.';

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

function makeCapabilities({ alerts = true, slos = true, loading = false } = {}) {
  return {
    loading,
    error: undefined,
    schema: 'ecs' as const,
    header: { serviceNameLink: true, badges: true },
    overview: { transactions: true, transactionTypeFilter: true, infraMetrics: true },
    footer: { alerts, slos },
  };
}

function setupContext({
  alerts = true,
  slos = true,
  loading = false,
  serviceNameLink = true,
}: { alerts?: boolean; slos?: boolean; loading?: boolean; serviceNameLink?: boolean } = {}) {
  mockUseServiceFlyoutContext.mockReturnValue({
    deps: {},
    service: { name: 'opbeans-java' },
    capabilities: {
      ...makeCapabilities({ alerts, slos, loading }),
      header: { serviceNameLink, badges: true },
    },
    filters: {
      environment: 'production',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    },
  });
}

function renderFooterMenu() {
  return renderHook(() => useServiceFlyoutFooterMenu());
}

/** The resolved menu-item props these tests assert against (the spread EBT attributes are not on the base type). */
interface ResolvedMenuItem {
  name?: string;
  href?: string;
  onClick?: (event: Partial<MouseEvent>) => void;
  'data-test-subj'?: string;
  'data-ebt-action'?: string;
  'data-ebt-element'?: string;
  'data-ebt-detail'?: string;
}

function findItem(
  items: FlyoutFooterMenuItem[],
  dataTestSubj: string
): ResolvedMenuItem | undefined {
  return (items as unknown as ResolvedMenuItem[]).find(
    (item) => item['data-test-subj'] === dataTestSubj
  );
}

describe('useServiceFlyoutFooterMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupContext();
    mockUseServiceFlyoutLinks.mockReturnValue(makeLinks());
  });

  it('enables the actions button and renders all action items when hrefs resolve', () => {
    const { result } = renderFooterMenu();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasActions).toBe(true);

    const items = result.current.panels[0].items;

    const overviewAction = findItem(items, 'serviceFlyoutActionsMenuItem-openServiceOverview');
    expect(overviewAction?.href).toBe('/app/apm/services/opbeans-java/overview');
    expect(overviewAction?.name).toBe('Open service overview');
    expect(overviewAction?.['data-ebt-action']).toBe('viewService');
    expect(overviewAction?.['data-ebt-element']).toBe('serviceFlyoutActionsMenu');
    expect(overviewAction?.['data-ebt-detail']).toBe('overview');

    const tracesAction = findItem(items, 'serviceFlyoutActionsMenuItem-openTracesInDiscover');
    expect(tracesAction?.href).toBe('/app/discover/traces');
    expect(tracesAction?.['data-ebt-action']).toBe('openInDiscover');
    expect(tracesAction?.['data-ebt-element']).toBe('serviceFlyoutActionsMenu');
    expect(tracesAction?.['data-ebt-detail']).toBe('traces');

    const logsAction = findItem(items, 'serviceFlyoutActionsMenuItem-openLogsInDiscover');
    expect(logsAction?.href).toBe('/app/discover/logs');
    expect(logsAction?.['data-ebt-action']).toBe('openInDiscover');
    expect(logsAction?.['data-ebt-detail']).toBe('logs');

    const alertsAction = findItem(items, 'serviceFlyoutActionsMenuItem-openAlerts');
    expect(alertsAction?.href).toEqual(expect.stringContaining('/app/observability/alerts'));

    const slosAction = findItem(items, 'serviceFlyoutActionsMenuItem-openSlos');
    expect(slosAction?.href).toBe('/app/slos?serviceName=opbeans-java');
  });

  it('omits Open service overview when the serviceNameLink capability is disabled', () => {
    setupContext({ serviceNameLink: false });
    const { result } = renderFooterMenu();
    const items = result.current.panels[0].items;

    expect(findItem(items, 'serviceFlyoutActionsMenuItem-openServiceOverview')).toBeUndefined();
    expect(findItem(items, 'serviceFlyoutActionsMenuItem-openTracesInDiscover')).toBeDefined();
  });

  it('renders the Alerts and SLOs group labels', () => {
    const { result } = renderFooterMenu();
    const items = result.current.panels[0].items;

    expect(findItem(items, 'serviceFlyoutActionsMenuGroup-alerts')).toBeDefined();
    expect(findItem(items, 'serviceFlyoutActionsMenuGroup-slos')).toBeDefined();
  });

  it('omits the alerts action when the alerts href is not available', () => {
    mockUseServiceFlyoutLinks.mockReturnValue({ ...makeLinks(), alerts: undefined });
    const { result } = renderFooterMenu();
    const items = result.current.panels[0].items;

    expect(findItem(items, 'serviceFlyoutActionsMenuItem-openAlerts')).toBeUndefined();
    expect(findItem(items, 'serviceFlyoutActionsMenuItem-openTracesInDiscover')).toBeDefined();
  });

  it('omits the Discover actions when no Discover hrefs resolve', () => {
    mockUseServiceFlyoutLinks.mockReturnValue({
      ...makeLinks(),
      discover: {
        traces: { href: undefined, openInDiscoverTab: undefined },
        logs: { href: undefined, openInDiscoverTab: undefined },
      },
    });
    const { result } = renderFooterMenu();
    const items = result.current.panels[0].items;

    expect(findItem(items, 'serviceFlyoutActionsMenuItem-openTracesInDiscover')).toBeUndefined();
    expect(findItem(items, 'serviceFlyoutActionsMenuItem-openLogsInDiscover')).toBeUndefined();
    expect(findItem(items, 'serviceFlyoutActionsMenuItem-openAlerts')).toBeDefined();
  });

  it('shows the actions button disabled while capabilities are loading', () => {
    setupContext({ loading: true });
    const { result } = renderFooterMenu();

    expect(result.current.isLoading).toBe(true);
  });

  it('disables the actions button when no actions are available', () => {
    mockUseServiceFlyoutLinks.mockReturnValue({
      ...makeLinks(),
      apm: { overviewTab: undefined, alertsTab: undefined },
      alerts: undefined,
      slos: undefined,
      discover: {
        traces: { href: undefined, openInDiscoverTab: undefined },
        logs: { href: undefined, openInDiscoverTab: undefined },
      },
    });
    const { result } = renderFooterMenu();

    expect(result.current.hasActions).toBe(false);
  });

  it('hides alerts and SLOs actions when capabilities disable them', () => {
    setupContext({ alerts: false, slos: false });
    const { result } = renderFooterMenu();
    const items = result.current.panels[0].items;

    expect(findItem(items, 'serviceFlyoutActionsMenuItem-openAlerts')).toBeUndefined();
    expect(findItem(items, 'serviceFlyoutActionsMenuItem-openSlos')).toBeUndefined();
    expect(findItem(items, 'serviceFlyoutActionsMenuItem-openTracesInDiscover')).toBeDefined();
  });

  describe('when openInDiscoverTab is provided', () => {
    it('shows "Open traces in a Discover tab" label for traces', () => {
      mockUseServiceFlyoutLinks.mockReturnValue(makeLinks({ tracesOpenInDiscoverTab: jest.fn() }));
      const { result } = renderFooterMenu();
      const tracesAction = findItem(
        result.current.panels[0].items,
        'serviceFlyoutActionsMenuItem-openTracesInDiscover'
      );

      expect(tracesAction?.name).toBe('Open traces in a Discover tab');
    });

    it('shows "Open traces in Discover" label when openInDiscoverTab is not provided', () => {
      const { result } = renderFooterMenu();
      const tracesAction = findItem(
        result.current.panels[0].items,
        'serviceFlyoutActionsMenuItem-openTracesInDiscover'
      );

      expect(tracesAction?.name).toBe('Open traces in Discover');
    });

    it('calls openInDiscoverTab when the traces action is clicked', () => {
      const mockOpenInDiscoverTab = jest.fn();
      mockUseServiceFlyoutLinks.mockReturnValue(
        makeLinks({ tracesOpenInDiscoverTab: mockOpenInDiscoverTab })
      );
      const { result } = renderFooterMenu();
      const tracesAction = findItem(
        result.current.panels[0].items,
        'serviceFlyoutActionsMenuItem-openTracesInDiscover'
      );

      tracesAction?.onClick?.({
        button: 0,
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        preventDefault: jest.fn(),
      });

      expect(mockOpenInDiscoverTab).toHaveBeenCalledTimes(1);
    });

    it('lets a modified click follow the href without calling openInDiscoverTab', () => {
      const mockOpenInDiscoverTab = jest.fn();
      const preventDefault = jest.fn();
      mockUseServiceFlyoutLinks.mockReturnValue(
        makeLinks({ tracesOpenInDiscoverTab: mockOpenInDiscoverTab })
      );
      const { result } = renderFooterMenu();
      const tracesAction = findItem(
        result.current.panels[0].items,
        'serviceFlyoutActionsMenuItem-openTracesInDiscover'
      );

      tracesAction?.onClick?.({
        button: 0,
        metaKey: true,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        preventDefault,
      });

      expect(mockOpenInDiscoverTab).not.toHaveBeenCalled();
      expect(preventDefault).not.toHaveBeenCalled();
    });
  });
});
