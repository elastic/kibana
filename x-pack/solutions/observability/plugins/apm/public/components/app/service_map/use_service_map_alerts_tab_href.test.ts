/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import type { MouseEvent } from 'react';
import { renderHook, act } from '@testing-library/react';
import { useServiceMapAlertsNavigateFactory } from './use_service_map_alerts_tab_href';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useApmRoutePath } from '../../../hooks/use_apm_route_path';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

vi.mock('../../../hooks/use_apm_router', () => {
  const mocked = {
    useApmRouter: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_apm_params', () => {
  const mocked = {
    useAnyOfApmParams: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_apm_route_path', () => {
  const mocked = {
    useApmRoutePath: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../context/apm_plugin/use_apm_plugin_context', () => {
  const mocked = {
    useApmPluginContext: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockedUseApmRouter = vi.mocked(useApmRouter);
const mockedUseAnyOfApmParams = vi.mocked(useAnyOfApmParams);
const mockedUseApmRoutePath = vi.mocked(useApmRoutePath);
const mockedUseApmPluginContext = vi.mocked(useApmPluginContext);

const mockedLink = vi.fn(
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

describe('useServiceMapAlertsNavigateFactory', () => {
  const navigateToUrl = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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

  it('navigates to the kuery-stripped alerts URL when the per-service handler fires', () => {
    const { result } = renderHook(() => useServiceMapAlertsNavigateFactory());

    const handler = result.current('opbeans-node');
    expect(handler).toBeDefined();

    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as MouseEvent;

    act(() => {
      handler!(event);
    });

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(navigateToUrl).toHaveBeenCalledTimes(1);

    const href = navigateToUrl.mock.calls[0][0] as string;
    expect(href).toContain('/app/apm/services/opbeans-node/alerts');
    const search = new URL(`http://x${href}`).searchParams;
    // Regression guard: the per-node alerts badge must not carry the map's
    // kuery filter (which is typically scoped to a different service) into
    // the alerts tab.
    expect(search.get('kuery')).toBe('');
    expect(search.get('environment')).toBe('production');
  });

  it('returns undefined when SPA navigation is unavailable (Agent Builder fallback)', () => {
    mockedUseApmPluginContext.mockReturnValue({
      core: { application: {} },
    } as unknown as ReturnType<typeof useApmPluginContext>);

    const { result } = renderHook(() => useServiceMapAlertsNavigateFactory());

    expect(result.current('opbeans-node')).toBeUndefined();
  });

  it('routes through /mobile-services on the mobile map context', () => {
    mockedUseApmRoutePath.mockReturnValue(
      '/mobile-services/{serviceName}/overview' as unknown as ReturnType<typeof useApmRoutePath>
    );

    const { result } = renderHook(() => useServiceMapAlertsNavigateFactory());
    const handler = result.current('opbeans-rum');
    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as MouseEvent;

    act(() => {
      handler!(event);
    });

    const href = navigateToUrl.mock.calls[0][0] as string;
    expect(href).toContain('/app/apm/mobile-services/opbeans-rum/alerts');
    const search = new URL(`http://x${href}`).searchParams;
    expect(search.get('kuery')).toBe('');
  });
});
