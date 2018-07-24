/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import Boom from 'boom';
import { ALL_RESOURCE } from '../../../../../common/constants';
import { wrapError } from '../../../../lib/errors';

export function initGetRolesApi(server, callWithRequest, routePreCheckLicenseFn, application) {

  const transformKibanaApplicationsFromEs = (roleApplications) => {
    return roleApplications
      .filter(roleApplication => roleApplication.application === application)
      .filter(roleApplication => roleApplication.resources.length > 0)
      .filter(roleApplication => roleApplication.resources.every(resource => resource === ALL_RESOURCE))
      .map(roleApplication => ({ privileges: roleApplication.privileges }));
  };

  const transformUnrecognizedApplicationsFromEs = (roleApplications) => {
    return _.uniq(roleApplications
      .filter(roleApplication => roleApplication.application !== application)
      .map(roleApplication => roleApplication.application));
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
      kibana: transformKibanaApplicationsFromEs(role.applications),
      _unrecognized_applications: transformUnrecognizedApplicationsFromEs(role.applications),
    };
  };

  const transformRolesFromEs = (roles) => {
    return _.map(roles, (role, name) => transformRoleFromEs(role, name));
  };

  server.route({
    method: 'GET',
    path: '/api/security/role',
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
    path: '/api/security/role/{name}',
    handler(request, reply) {
      const name = request.params.name;
      return callWithRequest(request, 'shield.getRole', { name }).then(
        (response) => {
          if (response[name]) return reply(transformRoleFromEs(response[name], name));
          return reply(Boom.notFound());
        },
        _.flow(wrapError, reply));
    },
    config: {
      pre: [routePreCheckLicenseFn]
    }
  });
}
