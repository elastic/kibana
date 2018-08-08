/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import {
  AUTH_SCOPE_DASHBORD_ONLY_MODE
} from '../common';

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
    method(request, reply) {
      const { auth, url } = request;
      const isAppRequest = url.path.startsWith('/app/');

      if (isAppRequest && auth.credentials.scope && auth.credentials.scope.includes(AUTH_SCOPE_DASHBORD_ONLY_MODE)) {
        if (url.path.startsWith('/app/kibana')) {
          // If the user is in "Dashboard only mode" they should only be allowed to see
          // that app and none others.  Here we are intercepting all other routing and ensuring the viewer
          // app is the only one ever rendered.
          // Read more about Dashboard Only Mode here: https://github.com/elastic/x-pack-kibana/issues/180
          reply.renderApp(dashboardViewerApp);
          return;
        }

        reply(Boom.notFound());
        return;
      }

      reply.continue();
    }
  };
}
