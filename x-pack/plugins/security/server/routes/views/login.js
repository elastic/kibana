/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

import { parseNext } from '../../lib/parse_next';

export function initLoginView(server, xpackMainPlugin) {
  const config = server.config();
  const cookieName = config.get('xpack.security.cookieName');
  const login = server.getHiddenUiAppById('login');

  function shouldShowLogin() {
    if (xpackMainPlugin && xpackMainPlugin.info) {
      const licenseCheckResults = xpackMainPlugin.info.feature('security').getLicenseCheckResults();
      if (licenseCheckResults) {
        return Boolean(licenseCheckResults.showLogin);
      }
    }

    // default to true if xpack info isn't available or
    // it can't be resolved for some reason
    return true;
  }

  server.route({
    method: 'GET',
    path: '/login',
    handler(request, reply) {
      const isUserAlreadyLoggedIn = !!request.state[cookieName];
      if (isUserAlreadyLoggedIn || !shouldShowLogin()) {
        const basePath = config.get('server.basePath');
        const url = get(request, 'raw.req.url');
        const next = parseNext(url, basePath);
        return reply.redirect(next);
      }
      return reply.renderAppWithDefaultConfig(login);
    },
    config: {
      auth: false
    }
  });
}
