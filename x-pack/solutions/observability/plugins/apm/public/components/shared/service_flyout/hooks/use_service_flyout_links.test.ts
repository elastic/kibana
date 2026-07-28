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

const mockUseDiscoverHref = jest.fn();
jest.mock('../../links/discover_links/use_discover_href', () => ({
  useDiscoverHref: (args: unknown) => mockUseDiscoverHref(args),
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
    service: { name: 'opbeans-java' },
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
    mockUseDiscoverHref.mockClear();
    mockUseServiceFlyoutContext.mockClear();
    mockUseServiceFlyoutContext.mockReturnValue(makeContext());
    mockUseDiscoverHref.mockImplementation(({ indexType }: { indexType: string }) =>
      indexType === 'traces' ? '/app/discover/traces' : '/app/discover/logs'
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

  it('builds apm.alertsTab using the APM locator, dropping the kuery', () => {
    renderHook(() => useServiceFlyoutLinks());

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      serviceName: 'opbeans-java',
      serviceOverviewTab: 'alerts',
      query: {
        environment: 'production',
        rangeFrom: 'now-15m',
        rangeTo: 'now',
      },
    });
  });

  it('scopes the Discover traces link to the service, environment, and transactionType', () => {
    mockUseServiceFlyoutContext.mockReturnValue(makeContext({ transactionType: 'request' }));
    renderHook(() => useServiceFlyoutLinks());

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
  });

  it('passes empty string transactionType to the Discover traces link before the type resolves', () => {
    renderHook(() => useServiceFlyoutLinks());

    expect(mockUseDiscoverHref).toHaveBeenCalledWith(
      expect.objectContaining({
        indexType: 'traces',
        queryParams: expect.objectContaining({ transactionType: '' }),
      })
    );
  });

  it('scopes the Discover logs link to the service and environment, without transactionType', () => {
    renderHook(() => useServiceFlyoutLinks());

    const logsCall = mockUseDiscoverHref.mock.calls.find(
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
    expect(result.current.apm.alertsTab).toEqual('/app/apm/services/opbeans-java/alerts');
    expect(result.current.slos).toEqual('/app/slos?serviceName=opbeans-java');
    expect(result.current.alerts).toEqual('/app/observability/alerts?mock');
    expect(result.current.discover.traces).toEqual('/app/discover/traces');
    expect(result.current.discover.logs).toEqual('/app/discover/logs');
  });

  it('returns undefined slos when the slo.read capability is missing', () => {
    mockUseServiceFlyoutContext.mockReturnValue(makeContext({ sloRead: false }));

    const { result } = renderHook(() => useServiceFlyoutLinks());

    expect(result.current.slos).toBeUndefined();
  });
});
