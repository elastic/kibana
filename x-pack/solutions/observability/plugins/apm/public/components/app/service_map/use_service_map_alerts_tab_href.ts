/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Alerts-tab navigation helpers for the Service Map.
 *
 * The module exposes three related hooks that all resolve the
 * service-scoped alerts-tab destination from the current map route
 * (`/service-map`, `/services/{serviceName}/service-map`, or
 * `/mobile-services/{serviceName}/service-map`) while preserving the
 * shared time range / query params:
 *
 *  - `useServiceMapAlertsTabHref` — returns a plain href for anchor-style use.
 *  - `useServiceMapAlertsTabNavigate` — returns an SPA-navigation click handler.
 *  - `useServiceMapAlertsNavigateFactory` — returns a `MakeAlertsNavigateHandler`
 *    factory injected through `ServiceMapAlertsNavigateProvider` to the shared
 *    `ServiceNode`, so route-dependent hooks run once at the map level rather
 *    than per node.
 *
 * All three rely on `useAnyOfApmParams` and will throw if called outside a
 * matching APM map route — callers must mount inside `ServiceMapGraph`, which
 * is wrapped by `ApmEmbeddableContext` on dashboard embeds.
 */

import type { KeyboardEvent, MouseEvent } from 'react';
import { useCallback, useMemo } from 'react';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useApmRoutePath } from '../../../hooks/use_apm_route_path';
import { useApmRouter } from '../../../hooks/use_apm_router';
import type { MakeAlertsNavigateHandler } from '../../shared/service_map/service_map_alerts_navigate_context';

/**
 * Alerts tab URL for a service on the service map, matching the service header
 * badge destination for the current map context (global, service detail, mobile).
 */
export function useServiceMapAlertsTabHref(serviceName: string) {
  const apmRouter = useApmRouter();
  const routePath = useApmRoutePath();
  const { query } = useAnyOfApmParams(
    '/service-map',
    '/services/{serviceName}/service-map',
    '/mobile-services/{serviceName}/service-map'
  );

  return useMemo(() => {
    // Badges ignore `kuery` (alerts aggregate across all visible services), so the
    // destination tab clears it too. Route schema requires `kuery: string`.
    const queryWithoutKuery = { ...query, kuery: '' };

    const isMobileContext = String(routePath).includes('mobile-services');
    if (isMobileContext) {
      return apmRouter.link('/mobile-services/{serviceName}/alerts', {
        path: { serviceName },
        query: queryWithoutKuery,
      });
    }
    return apmRouter.link('/services/{serviceName}/alerts', {
      path: { serviceName },
      query: queryWithoutKuery,
    });
  }, [apmRouter, query, routePath, serviceName]);
}

/**
 * SPA navigation to the alerts tab (avoids full page reload from a plain anchor href).
 */
export function useServiceMapAlertsTabNavigate(serviceName: string) {
  const alertsTabHref = useServiceMapAlertsTabHref(serviceName);
  const apmPluginContext = useApmPluginContext();
  const navigateToUrl = apmPluginContext?.core?.application?.navigateToUrl;

  return useCallback(
    (e: MouseEvent | KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      navigateToUrl?.(alertsTabHref);
    },
    [alertsTabHref, navigateToUrl]
  );
}

/**
 * Factory hook used by `ServiceMapAlertsNavigateProvider` to expose a per-service
 * navigate handler to the shared `ServiceNode`. Computes route-dependent values
 * once and returns a stable factory function. Returns `undefined` for a service
 * when the surrounding plugin context can't provide SPA navigation, so callers
 * can degrade gracefully (e.g. render a non-interactive badge).
 */
export function useServiceMapAlertsNavigateFactory(): MakeAlertsNavigateHandler {
  const apmRouter = useApmRouter();
  const routePath = useApmRoutePath();
  const { query } = useAnyOfApmParams(
    '/service-map',
    '/services/{serviceName}/service-map',
    '/mobile-services/{serviceName}/service-map'
  );
  const apmPluginContext = useApmPluginContext();
  const navigateToUrl = apmPluginContext?.core?.application?.navigateToUrl;

  return useCallback(
    (serviceName: string) => {
      if (!navigateToUrl) {
        return undefined;
      }
      const isMobileContext = String(routePath).includes('mobile-services');
      const href = isMobileContext
        ? apmRouter.link('/mobile-services/{serviceName}/alerts', {
            path: { serviceName },
            query,
          })
        : apmRouter.link('/services/{serviceName}/alerts', {
            path: { serviceName },
            query,
          });
      return (e: MouseEvent | KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();
        navigateToUrl(href);
      };
    },
    [apmRouter, routePath, query, navigateToUrl]
  );
}
