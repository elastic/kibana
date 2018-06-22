/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import Boom from 'boom';
import { getClient } from '../../../../../../../server/lib/get_client_shield';
import { roleSchema } from '../../../../lib/role_schema';
import { wrapError } from '../../../../lib/errors';
import { routePreCheckLicense } from '../../../../lib/route_pre_check_license';
import { containsOtherApplications } from './contains_other_applications';

export function initRolesApi(server) {
  const callWithRequest = getClient(server).callWithRequest;
  const routePreCheckLicenseFn = routePreCheckLicense(server);

  server.route({
    method: 'GET',
    path: '/api/security/v1/roles',
    handler(request, reply) {
      const config = server.config();

      return callWithRequest(request, 'shield.getRole').then(
        (response) => {
          const application = config.get('xpack.security.rbac.application');

          const roles = _.map(response, (role, name) => {
            const hasUnsupportedCustomPrivileges = containsOtherApplications(role, application);

            return _.assign(role, { name, hasUnsupportedCustomPrivileges });
          });

          return reply(roles);
        },
        _.flow(wrapError, reply)
      );
    },
    config: {
      pre: [routePreCheckLicenseFn]
    }
  });

  server.route({
    method: 'GET',
    path: '/api/security/v1/roles/{name}',
    handler(request, reply) {
      const name = request.params.name;
      return callWithRequest(request, 'shield.getRole', { name }).then(
        (response) => {
          if (response[name]) return reply(_.assign(response[name], { name }));
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
    path: '/api/security/v1/roles/{name}',
    handler(request, reply) {
      const name = request.params.name;
      // TODO(legrego) - temporarily remove applications from role until ES API is implemented
      const body = _.omit(request.payload, ['name', 'applications', 'hasUnsupportedCustomPrivileges']);

      return callWithRequest(request, 'shield.putRole', { name, body }).then(
        () => reply(request.payload),
        _.flow(wrapError, reply));
    },
    config: {
      validate: {
        payload: roleSchema
      },
      pre: [routePreCheckLicenseFn]
    }
  });

  server.route({
    method: 'DELETE',
    path: '/api/security/v1/roles/{name}',
    handler(request, reply) {
      const name = request.params.name;
      return callWithRequest(request, 'shield.deleteRole', { name }).then(
        () => reply().code(204),
        _.flow(wrapError, reply));
    },
    config: {
      pre: [routePreCheckLicenseFn]
    }
  });
}
