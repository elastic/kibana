/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function initLoggedOutView(server) {
  const loggedOut = server.getHiddenUiAppById('logged_out');

  server.route({
    method: 'GET',
    path: '/logged_out',
    handler(request, reply) {
      return reply.renderAppWithDefaultConfig(loggedOut);
    },
    config: {
      auth: false
    }
  });
}
