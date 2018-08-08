/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick, transform, uniq } from 'lodash';
import { buildLegacyIndexPrivileges } from './privileges';
import { validateEsPrivilegeResponse } from './validate_es_response';

export const CHECK_PRIVILEGES_RESULT = {
  UNAUTHORIZED: Symbol('Unauthorized'),
  AUTHORIZED: Symbol('Authorized'),
  LEGACY: Symbol('Legacy'),
};

export function checkPrivilegesWithRequestFactory(shieldClient, config, actions, application) {
  const { callWithRequest } = shieldClient;

  const kibanaIndex = config.get('kibana.index');

  const hasIncompatibileVersion = (applicationPrivilegesResponse) => {
    return Object.values(applicationPrivilegesResponse).some(resource => !resource[actions.version] && resource[actions.login]);
  };

  const hasAllApplicationPrivileges = (applicationPrivilegesResponse) => {
    return Object.values(applicationPrivilegesResponse).every(resource => Object.values(resource).every(action => action === true));
  };

  const hasNoApplicationPrivileges = (applicationPrivilegesResponse) => {
    return Object.values(applicationPrivilegesResponse).every(resource => Object.values(resource).every(action => action === false));
  };

  const isLegacyFallbackEnabled = () => {
    return config.get('xpack.security.authorization.legacyFallback.enabled');
  };

  const hasLegacyPrivileges = (indexPrivilegesResponse) => {
    return Object.values(indexPrivilegesResponse).includes(true);
  };

  const determineResult = (applicationPrivilegesResponse, indexPrivilegesResponse) => {
    if (hasAllApplicationPrivileges(applicationPrivilegesResponse)) {
      return CHECK_PRIVILEGES_RESULT.AUTHORIZED;
    }

    if (
      isLegacyFallbackEnabled() &&
      hasNoApplicationPrivileges(applicationPrivilegesResponse) &&
      hasLegacyPrivileges(indexPrivilegesResponse)
    ) {
      return CHECK_PRIVILEGES_RESULT.LEGACY;
    }

    return CHECK_PRIVILEGES_RESULT.UNAUTHORIZED;
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
          index: [{
            names: [kibanaIndex],
            privileges: buildLegacyIndexPrivileges()
          }],
        }
      });

      validateEsPrivilegeResponse(hasPrivilegesResponse, application, allApplicationPrivileges, resources, kibanaIndex);

      const applicationPrivilegesResponse = hasPrivilegesResponse.application[application];
      const indexPrivilegesResponse = hasPrivilegesResponse.index[kibanaIndex];

      if (hasIncompatibileVersion(applicationPrivilegesResponse)) {
        throw new Error('Multiple versions of Kibana are running against the same Elasticsearch cluster, unable to authorize user.');
      }

      return {
        result: determineResult(applicationPrivilegesResponse, indexPrivilegesResponse),
        username: hasPrivilegesResponse.username,
        // we needfilter out the non requested privileges from the response
        response: transform(applicationPrivilegesResponse, (response, resourcePrivilegesResponse, resourceResponse) => {
          response[resourceResponse] = pick(resourcePrivilegesResponse, privileges);
        }),
      };
    };
  };
}
