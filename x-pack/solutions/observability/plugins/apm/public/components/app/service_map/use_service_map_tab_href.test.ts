/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useServiceMapTabHrefBuilder } from './use_service_map_tab_href';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useApmRoutePath } from '../../../hooks/use_apm_route_path';

jest.mock('../../../hooks/use_apm_router', () => ({
  useApmRouter: jest.fn(),
}));

jest.mock('../../../hooks/use_apm_params', () => ({
  useAnyOfApmParams: jest.fn(),
}));

jest.mock('../../../hooks/use_apm_route_path', () => ({
  useApmRoutePath: jest.fn(),
}));

const mockedUseApmRouter = jest.mocked(useApmRouter);
const mockedUseAnyOfApmParams = jest.mocked(useAnyOfApmParams);
const mockedUseApmRoutePath = jest.mocked(useApmRoutePath);

const mockedLink = jest.fn(
  (path: string, args: { path?: Record<string, string>; query?: Record<string, unknown> }) => {
    const concretePath = path.replace(/\{serviceName\}/, args.path?.serviceName ?? '');
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(args.query ?? {})) {
      if (v !== undefined) search.set(k, String(v));
    }
    const qs = search.toString();
    return `/app/apm${concretePath}${qs ? `?${qs}` : ''}`;
  }
);

const serviceMapQuery = {
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  environment: 'production',
  kuery: 'service.name: "opbeans-node"',
  comparisonEnabled: false,
  offset: '15m',
  serviceGroup: '',
};

describe('useServiceMapTabHrefBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseApmRouter.mockReturnValue({ link: mockedLink } as unknown as ReturnType<
      typeof useApmRouter
    >);
    mockedUseAnyOfApmParams.mockReturnValue({ query: serviceMapQuery } as unknown as ReturnType<
      typeof useAnyOfApmParams
    >);
  });

  it('builds an overview-tab link and resets the map kuery', () => {
    mockedUseApmRoutePath.mockReturnValue(
      '/service-map' as unknown as ReturnType<typeof useApmRoutePath>
    );

    const { result } = renderHook(() => useServiceMapTabHrefBuilder('overview'));
    const href = result.current('opbeans-node');

    expect(href).toContain('/app/apm/services/opbeans-node/overview');
    const search = new URL(`http://x${href}`).searchParams;
    expect(search.get('kuery')).toBe('');
    expect(search.get('environment')).toBe('production');
  });

  it('builds a mobile-services overview-tab link on the mobile map context', () => {
    mockedUseApmRoutePath.mockReturnValue(
      '/mobile-services/{serviceName}/service-map' as unknown as ReturnType<typeof useApmRoutePath>
    );

    const { result } = renderHook(() => useServiceMapTabHrefBuilder('overview'));
    const href = result.current('opbeans-rum');

    expect(href).toContain('/app/apm/mobile-services/opbeans-rum/overview');
    const search = new URL(`http://x${href}`).searchParams;
    expect(search.get('kuery')).toBe('');
  });
});
