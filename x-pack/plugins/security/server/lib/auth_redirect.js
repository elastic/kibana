/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { wrapError } from './errors';

/**
 * Creates a hapi authenticate function that conditionally redirects
 * on auth failure.
 * @param {Hapi.Server} server HapiJS Server instance.
 * @returns {Function} Authentication function that will be called by Hapi for every
 * request that needs to be authenticated.
 */
export function authenticateFactory(server) {
  return async function authenticate(request, reply) {
    // If security is disabled or license is basic, continue with no user credentials
    // and delete the client cookie as well.
    const xpackInfo = server.plugins.xpack_main.info;
    if (xpackInfo.isAvailable()
        && (!xpackInfo.feature('security').isEnabled() || xpackInfo.license.isOneOf('basic'))) {
      reply.continue({ credentials: {} });
      return;
    }

    let authenticationResult;
    try {
      authenticationResult = await server.plugins.security.authenticate(request);
    } catch(err) {
      server.log(['error', 'authentication'], err);
      reply(wrapError(err));
      return;
    }

    if (authenticationResult.succeeded()) {
      reply.continue({ credentials: authenticationResult.user });
    } else if (authenticationResult.redirected()) {
      // Some authentication mechanisms may require user to be redirected to another location to
      // initiate or complete authentication flow. It can be Kibana own login page for basic
      // authentication (username and password) or arbitrary external page managed by 3rd party
      // Identity Provider for SSO authentication mechanisms. Authentication provider is the one who
      // decides what location user should be redirected to.
      reply.redirect(authenticationResult.redirectURL);
    } else if (authenticationResult.failed()) {
      server.log(['info', 'authentication'], `Authentication attempt failed: ${authenticationResult.error.message}`);
      reply(wrapError(authenticationResult.error));
    } else {
      reply(Boom.unauthorized());
    }
  };
}
