/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import Boom from 'boom';
import { getClient } from '../../../../../../server/lib/get_client_shield';
import { roleSchema } from '../../../lib/role_schema';
import { wrapError } from '../../../lib/errors';
import { routePreCheckLicense } from '../../../lib/route_pre_check_license';
import { ALL_RESOURCE } from '../../../../common/constants';

export function initRolesApi(server) {
  const callWithRequest = getClient(server).callWithRequest;
  const routePreCheckLicenseFn = routePreCheckLicense(server);

  const { application } = server.plugins.security.authorization;

  const transformRoleApplicationsFromEs = (roleApplications) => {
    return roleApplications
      .filter(roleApplication => roleApplication.application === application)
      .filter(roleApplication => !roleApplication.resources.some(resource => resource !== ALL_RESOURCE))
      .map(roleApplication => ({ privileges: roleApplication.privileges }));
  };

  const transformRoleFromEs = (role, name) => {
    return {
      name,
      metadata: role.metadata,
      transient_metadata: role.transient_metadata,
      elasticsearch: {
        cluster: role.cluster,
        indices: role.indices,
        run_as: role.run_as,
      },
      kibana: transformRoleApplicationsFromEs(role.applications)
    };
  };

  const transformRolesFromEs = (roles) => {
    return _.map(roles, (role, name) => transformRoleFromEs(role, name));
  };

  server.route({
    method: 'GET',
    path: '/api/security/roles',
    handler(request, reply) {
      return callWithRequest(request, 'shield.getRole').then(
        (response) => {
          return reply(transformRolesFromEs(response));
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
    path: '/api/security/roles/{name}',
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
    path: '/api/security/roles/{name}',
    handler(request, reply) {
      const name = request.params.name;
      const body = _.omit(request.payload, 'name');
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
    path: '/api/security/roles/{name}',
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
