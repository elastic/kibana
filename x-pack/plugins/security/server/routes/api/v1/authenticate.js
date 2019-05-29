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
        // When authenticating using SAML we _expect_ to redirect to the SAML Identity provider.
        const authenticationResult = await server.plugins.security.authenticate(request);
        if (authenticationResult.redirected()) {
          return h.redirect(authenticationResult.redirectURL);
        }

        return Boom.unauthorized(authenticationResult.error);
      } catch (err) {
        return wrapError(err);
      }
    }
  });

  server.route({
    // POST is only allowed for Third Party initiated authentication
    method: ['GET', 'POST'],
    path: '/api/security/v1/oidc',
    config: {
      auth: false,
      validate: {
        query: Joi.object().keys({
          iss: Joi.string().uri({ scheme: 'https' }),
          login_hint: Joi.string(),
          target_link_uri: Joi.string().uri(),
          code: Joi.string(),
          error: Joi.string(),
          error_description: Joi.string(),
          error_uri: Joi.string().uri(),
          state: Joi.string()
        }).unknown()
      }
    },
    async handler(request, h) {
      try {
        // We handle the fact that the user might get redirected to Kibana while already having an session
        // Return an error notifying the user they are already logged in.
        const authenticationResult = await server.plugins.security.authenticate(request);
        if (authenticationResult.succeeded()) {
          return Boom.forbidden(
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
