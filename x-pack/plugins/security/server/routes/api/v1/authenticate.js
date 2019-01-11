/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import Joi from 'joi';
import { wrapError } from '../../../lib/errors';
import { canRedirectRequest } from '../../../lib/can_redirect_request';

export function initAuthenticateApi(server) {

  server.route({
    method: 'POST',
    path: '/api/security/v1/login',
    config: {
      auth: false,
      validate: {
        payload: Joi.object({
          username: Joi.string().required(),
          password: Joi.string().required()
        })
      },
      response: {
        emptyStatusCode: 204,
      }
    },
    async handler(request, h) {
      const { username, password } = request.payload;

      try {
        request.loginAttempt().setCredentials(username, password);
        const authenticationResult = await server.plugins.security.authenticate(request);

        if (!authenticationResult.succeeded()) {
          throw Boom.unauthorized(authenticationResult.error);
        }

        return h.response();
      } catch(err) {
        throw wrapError(err);
      }
    }
  });

  server.route({
    method: 'POST',
    path: '/api/security/v1/saml',
    config: {
      auth: false,
      validate: {
        payload: Joi.object({
          SAMLResponse: Joi.string().required(),
          RelayState: Joi.string().allow('')
        })
      }
    },
    async handler(request, h) {
      try {
        // When authenticating using SAML we _expect_ to redirect to the SAML provider.
        // However, it may happen that Identity Provider sends a new SAML Response
        // while user has an active session already (e.g. user opens Kibana from
        // Identity Provider portal in two different tabs or logged in as a different
        // user and tries to open Kibana once again). If we receive a success instead
        // of a redirect when trying to authenticate the user, we know this has occured,
        // and we return an appropriate error to the user.

        // NOTE: there are several ways to handle the case when Kibana has an active
        // session, but its ACS endpoint receives another SAMLResponse. We can't just
        // silently ignore that new SAMLResponse since it might be for a different
        // user, and we would not know, and users might not notice.
        //
        // Options:
        //
        // 1. Give users an error saying they’re already logged in;
        // 2. Send the new SAML Response to ES and check if it’s for the same user. If so,
        //    we’re probably OK, if not show error (probably);
        // 3. Terminate the old session and start a new one;
        // 4. Ask the user.
        //
        // We currently implement option 1, as it seems to be the easiest and safest,
        // although it might not be the ideal UX in the long term.
        const authenticationResult = await server.plugins.security.authenticate(request);
        if (authenticationResult.succeeded()) {
          throw Boom.forbidden(
            'Sorry, you already have an active Kibana session. ' +
            'If you want to start a new one, please logout from the existing session first.'
          );
        }

        if (authenticationResult.redirected()) {
          return h.redirect(authenticationResult.redirectURL);
        }

        throw Boom.unauthorized(authenticationResult.error);
      } catch (err) {
        throw wrapError(err);
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/api/security/v1/logout',
    config: {
      auth: false
    },
    async handler(request, h) {
      if (!canRedirectRequest(request)) {
        throw Boom.badRequest('Client should be able to process redirect response.');
      }

      try {
        const deauthenticationResult = await server.plugins.security.deauthenticate(request);
        if (deauthenticationResult.failed()) {
          throw wrapError(deauthenticationResult.error);
        }

        return h.redirect(
          deauthenticationResult.redirectURL || `${server.config().get('server.basePath')}/`
        );
      } catch (err) {
        throw wrapError(err);
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/api/security/v1/me',
    handler(request) {
      return request.auth.credentials;
    }
  });
}
