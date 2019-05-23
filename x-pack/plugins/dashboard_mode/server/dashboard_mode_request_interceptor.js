/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import {
  CONFIG_DASHBOARD_ONLY_MODE_ROLES,
} from '../common';

const superuserRole = 'superuser';

/**
 *  Intercept all requests after auth has completed and apply filtering
 *  logic to enforce `xpack:dashboardMode` scope
 *
 *  @type {Hapi.RequestExtension}
 */
export function createDashboardModeRequestInterceptor(dashboardViewerApp) {
  if (!dashboardViewerApp) {
    throw new TypeError('Expected to receive a `dashboardViewerApp` argument');
  }

  return {
    type: 'onPostAuth',
    async method(request, h) {
      const { auth, url } = request;
      const isAppRequest = url.path.startsWith('/app/');

      if (!isAppRequest) {
        return h.continue;
      }

      const user = auth.credentials;

      const uiSettings = request.getUiSettingsService();

      const dashboardOnlyModeRoles = await uiSettings.get(CONFIG_DASHBOARD_ONLY_MODE_ROLES);

      if (!dashboardOnlyModeRoles || user.roles.length === 0) {
        return;
      }

      const isDashboardOnlyModeUser = user.roles.find(role => dashboardOnlyModeRoles.includes(role));
      const isSuperUser = user.roles.find(role => role === superuserRole);

      const enforceDashboardOnlyMode = isDashboardOnlyModeUser && !isSuperUser;
      if (enforceDashboardOnlyMode) {
        if (url.path.startsWith('/app/kibana')) {
          // If the user is in "Dashboard only mode" they should only be allowed to see
          // that app and none others.  Here we are intercepting all other routing and ensuring the viewer
          // app is the only one ever rendered.
          // Read more about Dashboard Only Mode here: https://github.com/elastic/x-pack-kibana/issues/180
          const response = await h.renderApp(dashboardViewerApp);
          return response.takeover();
        }

        throw Boom.notFound();
      }

      return h.continue;
    }
  };
}
