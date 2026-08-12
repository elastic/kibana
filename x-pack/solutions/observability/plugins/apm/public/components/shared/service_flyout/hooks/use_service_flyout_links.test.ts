/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { APM_APP_LOCATOR_ID } from '../../../../locator/service_detail_locator';
import { useServiceFlyoutLinks } from './use_service_flyout_links';

jest.mock('../../../../hooks/use_manage_slos_url', () => ({
  getManageSlosUrl: jest.fn(() => '/app/slos?serviceName=opbeans-java'),
}));

jest.mock('../footer/hooks/use_alerts_href', () => ({
  useAlertsHref: jest.fn(() => '/app/observability/alerts?mock'),
}));

const mockUseFlyoutDiscoverHref = jest.fn();
jest.mock('../utils/get_flyout_discover_navigation', () => ({
  getFlyoutDiscoverNavigation: (args: unknown) => mockUseFlyoutDiscoverHref(args),
}));

const mockGetRedirectUrl = jest.fn(
  (payload: { serviceName: string; serviceOverviewTab?: string }) => {
    const tab = payload.serviceOverviewTab ?? 'overview';
    return `/app/apm/services/${payload.serviceName}/${tab}`;
  }
);
const mockLocatorsGet = jest.fn(() => ({ getRedirectUrl: mockGetRedirectUrl }));

const mockUseServiceFlyoutContext = jest.fn();
jest.mock('../service_flyout_context', () => ({
  useServiceFlyoutContext: (...args: unknown[]) => mockUseServiceFlyoutContext(...args),
}));

function makeContext(overrides: { sloRead?: boolean; transactionType?: string } = {}) {
  const { sloRead = true, transactionType } = overrides;
  return {
    deps: {
      core: { application: { capabilities: { slo: { read: sloRead } } } },
      share: { url: { locators: { get: mockLocatorsGet } } },
    },
    capabilities: {
      loading: false,
      error: undefined,
      schema: 'ecs' as const,
      header: { serviceNameLink: true, badges: true },
      overview: { transactions: true, transactionTypeFilter: true, infraMetrics: true },
      footer: { alerts: true, slos: true },
    },
    service: { name: 'opbeans-java' },
    indices: {
      transaction: 'traces-apm-*',
      span: 'traces-apm-*',
      error: 'logs-apm.error-*',
      metric: 'metrics-apm-*',
    },
    filters: {
      environment: 'production',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      transactionType,
    },
  };
}

describe('useServiceFlyoutLinks', () => {
  beforeEach(() => {
    mockLocatorsGet.mockClear();
    mockGetRedirectUrl.mockClear();
    mockUseFlyoutDiscoverHref.mockClear();
    mockUseServiceFlyoutContext.mockClear();
    mockUseServiceFlyoutContext.mockReturnValue(makeContext());
    mockUseFlyoutDiscoverHref.mockImplementation(({ indexType }: { indexType: string }) =>
      indexType === 'traces'
        ? { href: '/app/discover/traces', esqlQuery: 'FROM traces-apm* | ...' }
        : { href: '/app/discover/logs', esqlQuery: 'FROM logs-apm* | ...' }
    );
  });

  it('builds apm.overview using the APM locator', () => {
    renderHook(() => useServiceFlyoutLinks());

    expect(mockLocatorsGet).toHaveBeenCalledWith(APM_APP_LOCATOR_ID);
    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      serviceName: 'opbeans-java',
      query: { environment: 'production', rangeFrom: 'now-15m', rangeTo: 'now' },
    });
  });

  it('scopes the Discover traces link to the service, environment, and transactionType', () => {
    mockUseServiceFlyoutContext.mockReturnValue(makeContext({ transactionType: 'request' }));
    renderHook(() => useServiceFlyoutLinks());

    expect(mockUseFlyoutDiscoverHref).toHaveBeenCalledWith(
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
  });

  it('passes empty string transactionType to the Discover traces link before the type resolves', () => {
    renderHook(() => useServiceFlyoutLinks());

    expect(mockUseFlyoutDiscoverHref).toHaveBeenCalledWith(
      expect.objectContaining({
        indexType: 'traces',
        queryParams: expect.objectContaining({ transactionType: '' }),
      })
    );
  });

  it('scopes the Discover logs link to the service and environment, without transactionType', () => {
    renderHook(() => useServiceFlyoutLinks());

    const logsCall = mockUseFlyoutDiscoverHref.mock.calls.find(
      ([args]: [{ indexType: string }]) => args.indexType === 'error'
    );
    expect(logsCall?.[0].queryParams).not.toHaveProperty('transactionType');
    expect(logsCall?.[0].queryParams).toEqual({
      serviceName: 'opbeans-java',
      environment: 'production',
      sortDirection: 'DESC',
    });
  });

  it('returns all expected link groups with the correct shape', () => {
    mockUseServiceFlyoutContext.mockReturnValue(makeContext({ transactionType: 'request' }));
    const { result } = renderHook(() => useServiceFlyoutLinks());

    expect(result.current.apm.overviewTab).toEqual('/app/apm/services/opbeans-java/overview');
    expect(result.current.slos).toEqual('/app/slos?serviceName=opbeans-java');
    expect(result.current.alerts).toEqual('/app/observability/alerts?mock');
    expect(result.current.discover.traces.href).toEqual('/app/discover/traces');
    expect(result.current.discover.logs.href).toEqual('/app/discover/logs');
    expect(result.current.discover.traces.openInDiscoverTab).toBeUndefined();
    expect(result.current.discover.logs.openInDiscoverTab).toBeUndefined();
  });

  it('builds openInDiscoverTab closures when openInNewDiscoverTab is in context', () => {
    const mockOpenInNewDiscoverTab = jest.fn();
    mockUseServiceFlyoutContext.mockReturnValue({
      ...makeContext({ transactionType: 'request' }),
      contextActions: { openInNewDiscoverTab: mockOpenInNewDiscoverTab },
    });

    const { result } = renderHook(() => useServiceFlyoutLinks());

    expect(result.current.discover.traces.openInDiscoverTab).toBeDefined();
    result.current.discover.traces.openInDiscoverTab!();
    expect(mockOpenInNewDiscoverTab).toHaveBeenCalledWith(
      expect.objectContaining({
        esqlQuery: 'FROM traces-apm* | ...',
        timeRange: { from: 'now-15m', to: 'now' },
        tabLabel: 'Traces - opbeans-java',
      })
    );
  });

  it('returns undefined slos when the slo.read capability is missing', () => {
    mockUseServiceFlyoutContext.mockReturnValue(makeContext({ sloRead: false }));

    const { result } = renderHook(() => useServiceFlyoutLinks());

    expect(result.current.slos).toBeUndefined();
  });
});
