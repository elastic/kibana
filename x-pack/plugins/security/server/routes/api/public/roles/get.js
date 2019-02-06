/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import Boom from 'boom';
import { GLOBAL_RESOURCE } from '../../../../../common/constants';
import { wrapError } from '../../../../lib/errors';
import { PrivilegeSerializer, ResourceSerializer } from '../../../../lib/authorization';

export function initGetRolesApi(server, callWithRequest, routePreCheckLicenseFn, application) {

  const transformKibanaApplicationsFromEs = (roleApplications) => {
    const roleKibanaApplications = roleApplications
      .filter(roleApplication => roleApplication.application === application);

    // if any application entry contains the '*' resource in addition to another resource, we can't transform these
    if (roleKibanaApplications.some(entry => entry.resources.includes(GLOBAL_RESOURCE) && entry.resources.length > 1)) {
      return {
        success: false
      };
    }

    const allResources = _.flatten(roleKibanaApplications.map(entry => entry.resources));
    // if we have improperly formatted resource entries, we can't transform these
    if (allResources.some(resource => resource !== GLOBAL_RESOURCE && !ResourceSerializer.isSerializedSpaceResource(resource))) {
      return {
        success: false
      };
    }

    // if we have resources duplicated in entries, we won't transform these
    if (allResources.length !== _.uniq(allResources).length) {
      return {
        success: false
      };
    }

    return {
      success: true,
      value: roleKibanaApplications.map(({ resources, privileges }) => {
      // if we're dealing with a global entry, which we've ensured above is only possible if it's the only item in the array
        if (resources.length === 1 && resources[0] === GLOBAL_RESOURCE) {
          const basePrivileges = privileges.filter(privilege => PrivilegeSerializer.isSerializedGlobalBasePrivilege(privilege));
          const featurePrivileges = privileges.filter(privilege =>
            !PrivilegeSerializer.isSerializedGlobalBasePrivilege(privilege) &&
            !PrivilegeSerializer.isSerializedReservedPrivilege(privilege)
          );

          return {
            base: basePrivileges.map(privilege => PrivilegeSerializer.serializeGlobalBasePrivilege(privilege)),
            feature: featurePrivileges.reduce((acc, privilege) => {
              const featurePrivilege = PrivilegeSerializer.deserializeFeaturePrivilege(privilege);
              return {
                ...acc,
                [featurePrivilege.featureId]: _.uniq([
                  ...acc[featurePrivilege.featureId] || [],
                  featurePrivilege.privilege
                ])
              };
            }, {}),
            spaces: ['*']
          };
        }

        const basePrivileges = privileges.filter(privilege => PrivilegeSerializer.isSerializedSpaceBasePrivilege(privilege));
        const featurePrivileges = privileges.filter(privilege => !PrivilegeSerializer.isSerializedSpaceBasePrivilege(privilege));
        return {
          base: basePrivileges.map(privilege => PrivilegeSerializer.deserializeSpaceBasePrivilege(privilege)),
          feature: featurePrivileges.reduce((acc, privilege) => {
            const featurePrivilege = PrivilegeSerializer.deserializeFeaturePrivilege(privilege);
            return {
              ...acc,
              [featurePrivilege.featureId]: _.uniq([
                ...acc[featurePrivilege.featureId] || [],
                featurePrivilege.privilege
              ])
            };
          }, {}),
          spaces: resources.map(resource => ResourceSerializer.deserializeSpaceResource(resource))
        };
      })
    };
  };

  const transformUnrecognizedApplicationsFromEs = (roleApplications) => {
    return _.uniq(roleApplications
      .filter(roleApplication => roleApplication.application !== application)
      .map(roleApplication => roleApplication.application));
  };

  const transformRoleFromEs = (role, name) => {
    const kibanaTransformResult = transformKibanaApplicationsFromEs(role.applications);

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
