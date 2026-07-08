/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { Environment } from '../../../../../common/environment_rt';
import { APM_APP_LOCATOR_ID } from '../../../../locator/service_detail_locator';
import { useServiceLinks } from './use_service_links';

jest.mock('../../../../hooks/use_manage_slos_url', () => ({
  getManageSlosUrl: jest.fn(() => '/app/slos?serviceName=opbeans-java'),
}));

const mockGetRedirectUrl = jest.fn(
  (payload: { serviceName: string; serviceOverviewTab?: string }) => {
    const tab = payload.serviceOverviewTab ?? 'overview';
    return `/app/apm/services/${payload.serviceName}/${tab}`;
  }
);
const mockLocatorsGet = jest.fn(() => ({ getRedirectUrl: mockGetRedirectUrl }));

jest.mock('../service_flyout_context', () => ({
  useServiceFlyoutContext: () => ({
    share: { url: { locators: { get: mockLocatorsGet } } },
  }),
}));

const baseParams = {
  serviceName: 'opbeans-java',
  environment: 'production' as Environment,
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  kuery: 'service.name : "opbeans-java"',
};

describe('useServiceLinks', () => {
  beforeEach(() => {
    mockLocatorsGet.mockClear();
    mockGetRedirectUrl.mockClear();
  });

  it('builds the overview link using the APM locator, preserving the kuery', () => {
    renderHook(() => useServiceLinks(baseParams));

    expect(mockLocatorsGet).toHaveBeenCalledWith(APM_APP_LOCATOR_ID);
    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      serviceName: 'opbeans-java',
      query: {
        environment: 'production',
        rangeFrom: 'now-15m',
        rangeTo: 'now',
        kuery: 'service.name : "opbeans-java"',
      },
    });
  });

  it('builds the alerts link using the APM locator, dropping the kuery', () => {
    renderHook(() => useServiceLinks(baseParams));

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

  it('returns overview, alerts, and slos hrefs', () => {
    const { result } = renderHook(() => useServiceLinks(baseParams));

    expect(result.current.overviewHref).toContain('/app/apm/services/opbeans-java/overview');
    expect(result.current.alertsHref).toContain('/app/apm/services/opbeans-java/alerts');
    expect(result.current.slosHref).toContain('/app/slos?serviceName=opbeans-java');
  });
});
