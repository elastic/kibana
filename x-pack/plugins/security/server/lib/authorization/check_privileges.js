/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick, transform, uniq } from 'lodash';
import { GLOBAL_RESOURCE } from '../../../common/constants';
import { spaceApplicationPrivilegesSerializer } from './space_application_privileges_serializer';
import { validateEsPrivilegeResponse } from './validate_es_response';

export function checkPrivilegesWithRequestFactory(actions, application, shieldClient) {
  const { callWithRequest } = shieldClient;

  const hasIncompatibileVersion = (applicationPrivilegesResponse) => {
    return Object.values(applicationPrivilegesResponse).some(resource => !resource[actions.version] && resource[actions.login]);
  };

  return function checkPrivilegesWithRequest(request) {

    const checkPrivilegesAtResources = async (resources, privilegeOrPrivileges) => {
      const privileges = Array.isArray(privilegeOrPrivileges) ? privilegeOrPrivileges : [privilegeOrPrivileges];
      const allApplicationPrivileges = uniq([actions.version, actions.login, ...privileges]);

      const hasPrivilegesResponse = await callWithRequest(request, 'shield.hasPrivileges', {
        body: {
          applications: [{
            application,
            resources,
            privileges: allApplicationPrivileges
          }],
        }
      });

      validateEsPrivilegeResponse(hasPrivilegesResponse, application, allApplicationPrivileges, resources);

      const applicationPrivilegesResponse = hasPrivilegesResponse.application[application];

      if (hasIncompatibileVersion(applicationPrivilegesResponse)) {
        throw new Error('Multiple versions of Kibana are running against the same Elasticsearch cluster, unable to authorize user.');
      }

      return {
        hasAllRequested: hasPrivilegesResponse.has_all_requested,
        username: hasPrivilegesResponse.username,
        // we need to filter out the non requested privileges from the response
        resourcePrivileges: transform(applicationPrivilegesResponse, (result, value, key) => {
          result[key] = pick(value, privileges);
        }),
      };
    };

    const checkPrivilegesAtResource = async (resource, privilegeOrPrivileges) => {
      const { hasAllRequested, username, resourcePrivileges } = await checkPrivilegesAtResources([resource], privilegeOrPrivileges);
      return {
        hasAllRequested,
        username,
        privileges: resourcePrivileges[resource],
      };
    };

    return {
      // TODO: checkPrivileges.atResources isn't necessary once we have the ES API to list all privileges
      // this should be removed when we switch to this API, and is not covered by unit tests currently
      atResources: checkPrivilegesAtResources,
      async atSpace(spaceId, privilegeOrPrivileges) {
        const spaceResource = spaceApplicationPrivilegesSerializer.resource.serialize(spaceId);
        return await checkPrivilegesAtResource(spaceResource, privilegeOrPrivileges);
      },
      async atSpaces(spaceIds, privilegeOrPrivileges) {
        const spaceResources = spaceIds.map(spaceId => spaceApplicationPrivilegesSerializer.resource.serialize(spaceId));
        const { hasAllRequested, username, resourcePrivileges } = await checkPrivilegesAtResources(spaceResources, privilegeOrPrivileges);
        return {
          hasAllRequested,
          username,
          // we need to turn the resource responses back into the space ids
          spacePrivileges: transform(resourcePrivileges, (result, value, key) => {
            result[spaceApplicationPrivilegesSerializer.resource.deserialize(key)] = value;
          }),
        };

      },
      async globally(privilegeOrPrivileges) {
        return await checkPrivilegesAtResource(GLOBAL_RESOURCE, privilegeOrPrivileges);
      },
    };
  };
}
