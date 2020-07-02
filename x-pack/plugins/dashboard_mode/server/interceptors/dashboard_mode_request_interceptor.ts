/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpServiceSetup, OnPostAuthHandler, IUiSettingsClient } from 'kibana/server';
import { SecurityPluginSetup } from '../../../security/server';
import { UI_SETTINGS } from '../../common';

const superuserRole = 'superuser';

interface DashboardModeRequestInterceptorDependencies {
  http: HttpServiceSetup;
  security: SecurityPluginSetup;
  getUiSettingsClient: () => Promise<IUiSettingsClient>;
}

export const setupDashboardModeRequestInterceptor = ({
  http,
  security,
  getUiSettingsClient,
}: DashboardModeRequestInterceptorDependencies) =>
  (async (request, response, toolkit) => {
    const path = request.url.path || '';
    const isAppRequest = path.startsWith('/app/');

    if (!isAppRequest) {
      return toolkit.next();
    }

    const authenticatedUser = security.authc.getCurrentUser(request);
    const roles = authenticatedUser?.roles || [];

    if (!authenticatedUser || roles.length === 0) {
      return toolkit.next();
    }

    const uiSettings = await getUiSettingsClient();
    const dashboardOnlyModeRoles = await uiSettings.get(
      UI_SETTINGS.CONFIG_DASHBOARD_ONLY_MODE_ROLES
    );

    if (!dashboardOnlyModeRoles) {
      return toolkit.next();
    }

    const isDashboardOnlyModeUser = roles.find((role) => dashboardOnlyModeRoles.includes(role));
    const isSuperUser = roles.find((role) => role === superuserRole);

    const enforceDashboardOnlyMode = isDashboardOnlyModeUser && !isSuperUser;

    if (enforceDashboardOnlyMode) {
      if (
        path.startsWith('/app/home') ||
        path.startsWith('/app/kibana') ||
        path.startsWith('/app/dashboards')
      ) {
        const dashBoardModeUrl = `${http.basePath.get(request)}/app/dashboard_mode`;
        // If the user is in "Dashboard only mode" they should only be allowed to see
        // the dashboard app and none others.

        return response.redirected({
          headers: {
            location: dashBoardModeUrl,
          },
        });
      }

      if (path.startsWith('/app/dashboard_mode')) {
        // let through requests to the dashboard_mode app
        return toolkit.next();
      }

      return response.notFound();
    }

    return toolkit.next();
  }) as OnPostAuthHandler;
