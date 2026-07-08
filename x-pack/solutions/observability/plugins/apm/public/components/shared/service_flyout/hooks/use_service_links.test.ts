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

const mockLink = jest.fn(
  (path: string, options: { path: Record<string, string>; query: Record<string, unknown> }) =>
    `${path}|${JSON.stringify(options)}`
);

const mockGetRedirectUrl = jest.fn(
  (payload: { serviceName: string }) => `/app/apm/services/${payload.serviceName}/overview`
);
const mockLocatorsGet = jest.fn(() => ({ getRedirectUrl: mockGetRedirectUrl }));

jest.mock('../../../../hooks/use_apm_router', () => ({
  useApmRouter: () => ({ link: mockLink }),
}));

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
    mockLink.mockClear();
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

  it('drops the kuery from the alerts link so it does not filter to a single service', () => {
    renderHook(() => useServiceLinks(baseParams));

    expect(mockLink).toHaveBeenCalledWith('/services/{serviceName}/alerts', {
      path: { serviceName: 'opbeans-java' },
      query: expect.objectContaining({
        environment: 'production',
        kuery: '',
      }),
    });
  });

  it('returns both hrefs', () => {
    const { result } = renderHook(() => useServiceLinks(baseParams));

    expect(result.current.overviewHref).toContain('/app/apm/services/opbeans-java/overview');
    expect(result.current.alertsHref).toContain('/services/{serviceName}/alerts');
  });
});
