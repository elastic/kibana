/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Alerts-tab navigation helper for the Service Map.
 *
 * Resolves the service-scoped alerts-tab destination from the current map
 * route while preserving the shared time range / environment params and
 * **stripping `kuery`** (alerts aggregate across all visible services, so a
 * node-scoped click would otherwise carry the map's service-name filter into a
 * destination where it yields zero results).
 *
 *  - `useServiceMapAlertsNavigateFactory` — returns a `MakeAlertsNavigateHandler`
 *    factory injected through `ServiceMapAlertsNavigateProvider` so the shared
 *    `ServiceNode` can produce per-service click handlers without itself
 *    calling `useAnyOfApmParams` (which would throw when the node is rendered
 *    outside an APM map route — e.g. the Agent Builder service map attachment).
 *
 * The map-context resolution (`services` vs `mobile-services`) and the
 * kuery-stripping rule live in `useServiceMapTabHrefBuilder` (see
 * `./use_service_map_tab_href`).
 */

import type { KeyboardEvent, MouseEvent } from 'react';
import { useCallback } from 'react';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import type { MakeAlertsNavigateHandler } from '../../shared/service_map/service_map_alerts_navigate_context';
import { useServiceMapTabHrefBuilder } from './use_service_map_tab_href';

/**
 * Factory used by `ServiceMapAlertsNavigateProvider` to expose a per-service
 * navigate handler to the shared `ServiceNode`. The route-dependent hooks
 * (`useAnyOfApmParams`, `useApmRoutePath`) run once here at the map level
 * — the shared `ServiceNode` itself can't call them because it's also
 * rendered by the Agent Builder service map attachment outside any APM
 * route. Returns `undefined` for a service when SPA navigation isn't
 * available, so callers can degrade to a non-interactive badge.
 */
export function useServiceMapAlertsNavigateFactory(): MakeAlertsNavigateHandler {
  const buildHref = useServiceMapTabHrefBuilder('alerts');
  const apmPluginContext = useApmPluginContext();
  const navigateToUrl = apmPluginContext?.core?.application?.navigateToUrl;

  return useCallback(
    (serviceName: string) => {
      if (!navigateToUrl) {
        return undefined;
      }
      const href = buildHref(serviceName);
      return (e: MouseEvent | KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();
        navigateToUrl(href);
      };
    },
    [buildHref, navigateToUrl]
  );
}
