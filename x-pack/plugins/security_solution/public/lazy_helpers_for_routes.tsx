/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteProps } from 'react-router-dom';
import type { Capabilities } from '@kbn/core/public';
import type { StartedSubPlugins } from './types';
import { CASES_SUB_PLUGIN_KEY } from './types';
import { CASES_FEATURE_ID, SERVER_APP_ID } from '../common/constants';
import { getNoPrivilegesPageLazy } from './no_privileges_lazy';
import { getRedirectRouteLazy } from './redirect_route_lazy';

export const isSubPluginAvailable = (pluginKey: string, capabilities: Capabilities): boolean => {
  if (CASES_SUB_PLUGIN_KEY === pluginKey) {
    return capabilities[CASES_FEATURE_ID].read_cases === true;
  }
  return capabilities[SERVER_APP_ID].show === true;
};

export const getSubPluginRoutesByCapabilities = (
  subPlugins: StartedSubPlugins,
  capabilities: Capabilities
): RouteProps[] => {
  return [
    ...Object.entries(subPlugins).reduce<RouteProps[]>((acc, [key, value]) => {
      if (isSubPluginAvailable(key, capabilities)) {
        return [...acc, ...value.routes];
      }
      return [
        ...acc,
        ...value.routes.map((route: RouteProps) => ({
          path: route.path,
          component: () => getNoPrivilegesPageLazy({ subPluginKey: key }),
        })),
      ];
    }, []),
    {
      path: '',
      component: () => getRedirectRouteLazy({ capabilities }),
    },
  ];
};
