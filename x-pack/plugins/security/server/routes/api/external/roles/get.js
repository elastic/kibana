/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import Boom from 'boom';
import { RESERVED_PRIVILEGES_APPLICATION_WILDCARD } from '../../../../../common/constants';
import { wrapError } from '../../../../lib/errors';
import { transformKibanaApplicationsFromEs } from '../../../../lib/authorization';

export function initGetRolesApi(server, callWithRequest, routePreCheckLicenseFn, application) {

  const transformRoleApplicationsFromEs = (roleApplications) => {
    const { success, value } = transformKibanaApplicationsFromEs(application, roleApplications);

    if (!success) {
      return { success, value };
    }

    const allSpaces = _.flatten(value.map(entry => entry.spaces));
    // if we have spaces duplicated in entries, we won't transform these
    if (allSpaces.length !== _.uniq(allSpaces).length) {
      return {
        success: false
      };
    }

    return { success, value };
  };

  const transformUnrecognizedApplicationsFromEs = (roleApplications) => {
    return _.uniq(roleApplications
      .filter(roleApplication =>
        roleApplication.application !== application &&
        roleApplication.application !== RESERVED_PRIVILEGES_APPLICATION_WILDCARD
      )
      .map(roleApplication => roleApplication.application));
  };

  const transformRoleFromEs = (role, name) => {
    const kibanaTransformResult = transformRoleApplicationsFromEs(role.applications);

    return {
      name,
      metadata: role.metadata,
      transient_metadata: role.transient_metadata,
      elasticsearch: {
        cluster: role.cluster,
        indices: role.indices,
        run_as: role.run_as,
      },
      kibana: kibanaTransformResult.success ? kibanaTransformResult.value : [],
      _transform_error: [
        ...(kibanaTransformResult.success ? [] : ['kibana'])
      ],
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
