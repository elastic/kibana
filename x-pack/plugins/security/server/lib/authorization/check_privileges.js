/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';
import { ALL_RESOURCE } from '../../../common/constants';
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
    return !applicationPrivilegesResponse[actions.version] && applicationPrivilegesResponse[actions.login];
  };

  const hasAllApplicationPrivileges = (applicationPrivilegesResponse) => {
    return Object.values(applicationPrivilegesResponse).every(val => val === true);
  };

  const hasNoApplicationPrivileges = (applicationPrivilegesResponse) => {
    return Object.values(applicationPrivilegesResponse).every(val => val === false);
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

    return async function checkPrivileges(privileges) {
      const allApplicationPrivileges = uniq([actions.version, actions.login, ...privileges]);
      const hasPrivilegesResponse = await callWithRequest(request, 'shield.hasPrivileges', {
        body: {
          applications: [{
            application,
            resources: [ALL_RESOURCE],
            privileges: allApplicationPrivileges
          }],
          index: [{
            names: [kibanaIndex],
            privileges: buildLegacyIndexPrivileges()
          }],
        }
      });

      validateEsPrivilegeResponse(hasPrivilegesResponse, application, allApplicationPrivileges, [ALL_RESOURCE], kibanaIndex);

      const applicationPrivilegesResponse = hasPrivilegesResponse.application[application][ALL_RESOURCE];
      const indexPrivilegesResponse = hasPrivilegesResponse.index[kibanaIndex];

      if (hasIncompatibileVersion(applicationPrivilegesResponse)) {
        throw new Error('Multiple versions of Kibana are running against the same Elasticsearch cluster, unable to authorize user.');
      }

      return {
        result: determineResult(applicationPrivilegesResponse, indexPrivilegesResponse),
        username: hasPrivilegesResponse.username,

        // we only return missing privileges that they're specifically checking for
        missing: Object.keys(applicationPrivilegesResponse)
          .filter(privilege => privileges.includes(privilege))
          .filter(privilege => !applicationPrivilegesResponse[privilege])
      };
    };
  };
}
