/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KeyboardEvent, MouseEvent } from 'react';
import { useCallback, useMemo } from 'react';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useApmRoutePath } from '../../../hooks/use_apm_route_path';
import { useApmRouter } from '../../../hooks/use_apm_router';

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
    const isMobileContext = String(routePath).includes('mobile-services');
    if (isMobileContext) {
      return apmRouter.link('/mobile-services/{serviceName}/alerts', {
        path: { serviceName },
        query,
      });
    }
    return apmRouter.link('/services/{serviceName}/alerts', {
      path: { serviceName },
      query,
    });
  }, [apmRouter, query, routePath, serviceName]);
}

/**
 * SPA navigation to the alerts tab (avoids full page reload from a plain anchor href).
 */
export function useServiceMapAlertsTabNavigate(serviceName: string) {
  const alertsTabHref = useServiceMapAlertsTabHref(serviceName);
  const {
    core: {
      application: { navigateToUrl },
    },
  } = useApmPluginContext();

  return useCallback(
    (e: MouseEvent | KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      navigateToUrl(alertsTabHref);
    },
    [alertsTabHref, navigateToUrl]
  );
}
