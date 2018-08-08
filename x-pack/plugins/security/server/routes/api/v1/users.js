/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import Boom from 'boom';
import Joi from 'joi';
import { getClient } from '../../../../../../server/lib/get_client_shield';
import { userSchema } from '../../../lib/user_schema';
import { wrapError } from '../../../lib/errors';
import { routePreCheckLicense } from '../../../lib/route_pre_check_license';
import { BasicCredentials } from '../../../../server/lib/authentication/providers/basic';

export function initUsersApi(server) {
  const callWithRequest = getClient(server).callWithRequest;
  const routePreCheckLicenseFn = routePreCheckLicense(server);

  server.route({
    method: 'GET',
    path: '/api/security/v1/users',
    handler(request, reply) {
      return callWithRequest(request, 'shield.getUser').then(
        (response) => reply(_.values(response)),
        _.flow(wrapError, reply)
      );
    },
    config: {
      pre: [routePreCheckLicenseFn]
    }
  });

  server.route({
    method: 'GET',
    path: '/api/security/v1/users/{username}',
    handler(request, reply) {
      const username = request.params.username;
      return callWithRequest(request, 'shield.getUser', { username }).then(
        (response) => {
          if (response[username]) return reply(response[username]);
          return reply(Boom.notFound());
        },
        _.flow(wrapError, reply));
    },
    config: {
      pre: [routePreCheckLicenseFn]
    }
  });

  server.route({
    method: 'POST',
    path: '/api/security/v1/users/{username}',
    handler(request, reply) {
      const username = request.params.username;
      const body = _(request.payload).omit(['username', 'enabled']).omit(_.isNull);
      return callWithRequest(request, 'shield.putUser', { username, body }).then(
        () => reply(request.payload),
        _.flow(wrapError, reply));
    },
    config: {
      validate: {
        payload: userSchema
      },
      pre: [routePreCheckLicenseFn]
    }
  });

  server.route({
    method: 'DELETE',
    path: '/api/security/v1/users/{username}',
    handler(request, reply) {
      const username = request.params.username;
      return callWithRequest(request, 'shield.deleteUser', { username }).then(
        () => reply().code(204),
        _.flow(wrapError, reply));
    },
    config: {
      pre: [routePreCheckLicenseFn]
    }
  });

  server.route({
    method: 'POST',
    path: '/api/security/v1/users/{username}/password',
    async handler(request, reply) {
      const username = request.params.username;
      const { password, newPassword } = request.payload;
      const isCurrentUser = username === request.auth.credentials.username;

      // If user tries to change own password, let's check if old password is valid first.
      if (isCurrentUser) {
        try {
          await server.plugins.security.getUser(
            BasicCredentials.decorateRequest(request, username, password)
          );
        } catch(err) {
          return reply(Boom.unauthorized(err));
        }
      }

      try {
        const body = { password: newPassword };
        await callWithRequest(request, 'shield.changePassword', { username, body });

        // Now we authenticate user with the new password again updating current session if any.
        if (isCurrentUser) {
          const authenticationResult = await server.plugins.security.authenticate(
            BasicCredentials.decorateRequest(request, username, newPassword)
          );

          if (!authenticationResult.succeeded()) {
            return reply(Boom.unauthorized((authenticationResult.error)));
          }
        }
      } catch(err) {
        return reply(wrapError(err));
      }

      return reply().code(204);
    },
    config: {
      validate: {
        payload: {
          password: Joi.string(),
          newPassword: Joi.string().required()
        }
      },
      pre: [routePreCheckLicenseFn]
    }
  });
}
