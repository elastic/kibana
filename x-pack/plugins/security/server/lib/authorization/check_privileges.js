/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick, transform, uniq } from 'lodash';
import { validateEsPrivilegeResponse } from './validate_es_response';

export function checkPrivilegesWithRequestFactory(shieldClient, config, actions, application) {
  const { callWithRequest } = shieldClient;

  const hasIncompatibileVersion = (applicationPrivilegesResponse) => {
    return Object.values(applicationPrivilegesResponse).some(resource => !resource[actions.version] && resource[actions.login]);
  };

  return function checkPrivilegesWithRequest(request) {

    return async function checkPrivileges(resources, privileges) {
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
        // we needfilter out the non requested privileges from the response
        response: transform(applicationPrivilegesResponse, (response, resourcePrivilegesResponse, resourceResponse) => {
          response[resourceResponse] = pick(resourcePrivilegesResponse, privileges);
        }),
      };
    };
  };
}
