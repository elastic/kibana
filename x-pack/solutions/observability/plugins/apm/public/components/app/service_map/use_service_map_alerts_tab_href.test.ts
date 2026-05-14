/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent } from 'react';
import { renderHook, act } from '@testing-library/react';
import {
  useServiceMapAlertsTabHref,
  useServiceMapAlertsTabNavigate,
} from './use_service_map_alerts_tab_href';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useApmRoutePath } from '../../../hooks/use_apm_route_path';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

jest.mock('../../../hooks/use_apm_router', () => ({
  useApmRouter: jest.fn(),
}));

jest.mock('../../../hooks/use_apm_params', () => ({
  useAnyOfApmParams: jest.fn(),
}));

jest.mock('../../../hooks/use_apm_route_path', () => ({
  useApmRoutePath: jest.fn(),
}));

jest.mock('../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: jest.fn(),
}));

const mockedUseApmRouter = jest.mocked(useApmRouter);
const mockedUseAnyOfApmParams = jest.mocked(useAnyOfApmParams);
const mockedUseApmRoutePath = jest.mocked(useApmRoutePath);
const mockedUseApmPluginContext = jest.mocked(useApmPluginContext);

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

describe('useServiceMapAlertsTabHref', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseApmRouter.mockReturnValue({ link: mockedLink } as unknown as ReturnType<
      typeof useApmRouter
    >);
    mockedUseAnyOfApmParams.mockReturnValue({ query: serviceMapQuery } as unknown as ReturnType<
      typeof useAnyOfApmParams
    >);
  });

  describe('from the global service map (/service-map)', () => {
    it('builds a link to /services/{serviceName}/alerts and resets the map kuery', () => {
      mockedUseApmRoutePath.mockReturnValue(
        '/service-map' as unknown as ReturnType<typeof useApmRoutePath>
      );

      const { result } = renderHook(() => useServiceMapAlertsTabHref('opbeans-node'));

      expect(result.current).toContain('/app/apm/services/opbeans-node/alerts');
      const search = new URL(`http://x${result.current}`).searchParams;
      expect(search.get('kuery')).toBe('');
    });

    it('carries environment, rangeFrom and rangeTo through to the alerts tab URL', () => {
      mockedUseApmRoutePath.mockReturnValue(
        '/service-map' as unknown as ReturnType<typeof useApmRoutePath>
      );

      const { result } = renderHook(() => useServiceMapAlertsTabHref('opbeans-node'));

      const search = new URL(`http://x${result.current}`).searchParams;
      expect(search.get('environment')).toBe('production');
      expect(search.get('rangeFrom')).toBe('now-15m');
      expect(search.get('rangeTo')).toBe('now');
    });

    it('passes `kuery: ""` to the router while preserving env / time / comparison', () => {
      mockedUseApmRoutePath.mockReturnValue(
        '/service-map' as unknown as ReturnType<typeof useApmRoutePath>
      );

      renderHook(() => useServiceMapAlertsTabHref('opbeans-node'));

      expect(mockedLink).toHaveBeenCalledTimes(1);
      const [, args] = mockedLink.mock.calls[0];
      expect(args.query).toMatchObject({
        kuery: '',
        environment: 'production',
        rangeFrom: 'now-15m',
        rangeTo: 'now',
        comparisonEnabled: false,
        offset: '15m',
      });
    });
  });

  describe('from a service-scoped service map (/services/{serviceName}/service-map)', () => {
    it('still links to /services/{serviceName}/alerts and resets kuery', () => {
      mockedUseApmRoutePath.mockReturnValue(
        '/services/{serviceName}/service-map' as unknown as ReturnType<typeof useApmRoutePath>
      );

      const { result } = renderHook(() => useServiceMapAlertsTabHref('opbeans-node'));

      expect(result.current).toContain('/app/apm/services/opbeans-node/alerts');
      const search = new URL(`http://x${result.current}`).searchParams;
      expect(search.get('kuery')).toBe('');
      expect(search.get('environment')).toBe('production');
    });
  });

  describe('from the mobile service map (/mobile-services/{serviceName}/service-map)', () => {
    it('links to /mobile-services/{serviceName}/alerts and resets kuery', () => {
      mockedUseApmRoutePath.mockReturnValue(
        '/mobile-services/{serviceName}/service-map' as unknown as ReturnType<
          typeof useApmRoutePath
        >
      );

      const { result } = renderHook(() => useServiceMapAlertsTabHref('opbeans-rum'));

      expect(result.current).toContain('/app/apm/mobile-services/opbeans-rum/alerts');
      const search = new URL(`http://x${result.current}`).searchParams;
      expect(search.get('kuery')).toBe('');
      expect(search.get('environment')).toBe('production');
    });
  });
});

describe('useServiceMapAlertsTabNavigate', () => {
  const navigateToUrl = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseApmRouter.mockReturnValue({ link: mockedLink } as unknown as ReturnType<
      typeof useApmRouter
    >);
    mockedUseAnyOfApmParams.mockReturnValue({ query: serviceMapQuery } as unknown as ReturnType<
      typeof useAnyOfApmParams
    >);
    mockedUseApmRoutePath.mockReturnValue(
      '/service-map' as unknown as ReturnType<typeof useApmRoutePath>
    );
    mockedUseApmPluginContext.mockReturnValue({
      core: { application: { navigateToUrl } },
    } as unknown as ReturnType<typeof useApmPluginContext>);
  });

  it('navigates to the kuery-stripped alerts URL on click', () => {
    const { result } = renderHook(() => useServiceMapAlertsTabNavigate('opbeans-node'));

    const event = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as MouseEvent;

    act(() => {
      result.current(event);
    });

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(navigateToUrl).toHaveBeenCalledTimes(1);

    const href = navigateToUrl.mock.calls[0][0] as string;
    expect(href).toContain('/app/apm/services/opbeans-node/alerts');
    const search = new URL(`http://x${href}`).searchParams;
    expect(search.get('kuery')).toBe('');
    expect(search.get('environment')).toBe('production');
  });
});
