/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import Boom from 'boom';
import { wrapError } from '../../../../lib/errors';
import { ALL_RESOURCE } from '../../../../../common/constants';

export function initGetRolesApi(server, callWithRequest, routePreCheckLicenseFn, application) {

  const transformKibanaApplicationsFromEs = (roleApplications) => {
    const roleKibanaApplications = roleApplications
      .filter(roleApplication => roleApplication.application === application);

    const resourcePrivileges = _.flatten(roleKibanaApplications
      .map(({ resources, privileges }) => resources.map(resource => ({ resource, privileges })))
    );

    return resourcePrivileges.reduce((result, { resource, privileges }) => {
      if (resource === ALL_RESOURCE) {
        result.global = _.uniq([...result.global, ...privileges]);
        return result;
      }

      const spacePrefix = 'space:';
      if (resource.startsWith(spacePrefix)) {
        const spaceId = resource.slice(spacePrefix.length);
        result.space[spaceId] = _.uniq([...result.space[spaceId] || [], ...privileges]);
        return result;
      }

      throw new Error(`Unknown application privilege resource: ${resource}`);
    }, {
      global: [],
      space: {},
    });
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
    async handler(request, reply) {
      try {
        const response = await callWithRequest(request, 'shield.getRole');
        return reply(transformRolesFromEs(response));
      } catch (error) {
        reply(wrapError(error));
      }
    },
    config: {
      pre: [routePreCheckLicenseFn]
    }
  });

  server.route({
    method: 'GET',
    path: '/api/security/role/{name}',
    async handler(request, reply) {
      const name = request.params.name;
      try {
        const response = await callWithRequest(request, 'shield.getRole', { name });
        if (response[name]) {
          return reply(transformRoleFromEs(response[name], name));
        }

        return reply(Boom.notFound());
      } catch (error) {
        reply(wrapError(error));
      }
    },
    config: {
      pre: [routePreCheckLicenseFn]
    }
  });
}
