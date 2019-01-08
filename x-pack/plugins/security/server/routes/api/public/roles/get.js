/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import Boom from 'boom';
import { GLOBAL_RESOURCE } from '../../../../../common/constants';
import { wrapError } from '../../../../lib/errors';
import { spaceApplicationPrivilegesSerializer } from '../../../../lib/authorization';

export function initGetRolesApi(server, callWithRequest, routePreCheckLicenseFn, application) {

  const transformKibanaApplicationsFromEs = (roleApplications) => {
    const roleKibanaApplications = roleApplications
      .filter(roleApplication => roleApplication.application === application);

    const resourcePrivileges = _.flatten(roleKibanaApplications
      .map(({ resources, privileges }) => resources.map(resource => ({ resource, privileges })))
    );

    return resourcePrivileges.reduce((result, { resource, privileges }) => {
      if (resource === GLOBAL_RESOURCE) {
        result.global = _.uniq([...result.global, ...privileges]);
        return result;
      }

      const spaceId = spaceApplicationPrivilegesSerializer.resource.deserialize(resource);
      result.space[spaceId] = _.uniq([
        ...result.space[spaceId] || [],
        ...privileges.map(privilege => spaceApplicationPrivilegesSerializer.privilege.deserialize(privilege))
      ]);
      return result;
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
    async handler(request) {
      try {
        const response = await callWithRequest(request, 'shield.getRole');
        return _.sortBy(transformRolesFromEs(response), 'name');
      } catch (error) {
        return wrapError(error);
      }
    },
    config: {
      pre: [routePreCheckLicenseFn]
    }
  });

  server.route({
    method: 'GET',
    path: '/api/security/role/{name}',
    async handler(request) {
      const name = request.params.name;
      try {
        const response = await callWithRequest(request, 'shield.getRole', { name });
        if (response[name]) {
          return transformRoleFromEs(response[name], name);
        }

        return Boom.notFound();
      } catch (error) {
        return wrapError(error);
      }
    },
    config: {
      pre: [routePreCheckLicenseFn]
    }
  });
}
