/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import type { RouteProps } from 'react-router-dom';
import type { Capabilities, CoreStart } from '@kbn/core/public';
import type { StartedSubPlugins } from './types';
import { CASES_SUB_PLUGIN_KEY } from './types';
import { APP_UI_ID, CASES_FEATURE_ID, SecurityPageName, SERVER_APP_ID } from '../common/constants';
import { getNoPrivilegesPageLazy } from './no_privileges_lazy';
import { getRedirectRouteLazy } from './redirect_route_lazy';

export const parseRoute = (location: Pick<Location, 'hash' | 'pathname' | 'search'>) => {
  if (!isEmpty(location.hash)) {
    const hashPath = location.hash.split('?');
    const search = hashPath.length >= 1 ? `?${hashPath[1]}` : '';
    const pageRoute = hashPath.length > 0 ? hashPath[0].split('/') : [];
    const pageName = pageRoute.length >= 1 ? pageRoute[1] : '';
    const path = `/${pageRoute.slice(2).join('/') ?? ''}${search}`;

    return {
      pageName,
      path,
      search,
    };
  }

  const search = location.search;
  const pageRoute = location.pathname.split('/');
  const pageName = pageRoute[3];
  const subpluginPath = pageRoute.length > 4 ? `/${pageRoute.slice(4).join('/')}` : '';
  const path = `${subpluginPath}${search}`;

  return {
    pageName,
    path,
    search,
  };
};

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

export const manageOldSiemRoutes = async (coreStart: CoreStart) => {
  const { application } = coreStart;
  const { pageName, path } = parseRoute(window.location);

  switch (pageName) {
    case SecurityPageName.overview:
      application.navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.overview,
        replace: true,
        path,
      });
      break;
    case 'ml-hosts':
      application.navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.hosts,
        replace: true,
        path: `/ml-hosts${path}`,
      });
      break;
    case SecurityPageName.hosts:
      application.navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.hosts,
        replace: true,
        path,
      });
      break;
    case 'ml-network':
      application.navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.network,
        replace: true,
        path: `/ml-network${path}`,
      });
      break;
    case SecurityPageName.network:
      application.navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.network,
        replace: true,
        path,
      });
      break;
    case SecurityPageName.timelines:
      application.navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.timelines,
        replace: true,
        path,
      });
      break;
    case SecurityPageName.case:
    case 'case':
      application.navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.case,
        replace: true,
        path,
      });
      break;
    case SecurityPageName.detections:
    case SecurityPageName.alerts:
      application.navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.alerts,
        replace: true,
        path,
      });
      break;
    case SecurityPageName.rules:
      application.navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.rules,
        replace: true,
        path,
      });
      break;
    case SecurityPageName.exceptions:
      application.navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.exceptions,
        replace: true,
        path,
      });
      break;
    default:
      application.navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.landing,
        replace: true,
        path,
      });
      break;
  }
};
