/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getClient } from '../../../../../server/lib/get_client_shield';
import { DEFAULT_RESOURCE } from '../../../common/constants';
import { getVersionPrivilege, getLoginPrivilege } from '../privileges';

const hasApplicationPrivileges = async (callWithRequest, request, kibanaVersion, application, privileges) => {
  const privilegeCheck = await callWithRequest(request, 'shield.hasPrivileges', {
    body: {
      applications: [{
        application,
        resources: [DEFAULT_RESOURCE],
        privileges
      }]
    }
  });

  const hasPrivileges = privilegeCheck.application[application][DEFAULT_RESOURCE];

  // We include the login action in all privileges, so the existence of it and not the version privilege
  // lets us know that we're running in an incorrect configuration. Without the login privilege check, we wouldn't
  // know whether the user just wasn't authorized for this instance of Kibana in general
  if (!hasPrivileges[getVersionPrivilege(kibanaVersion)] && hasPrivileges[getLoginPrivilege()]) {
    throw new Error('Multiple versions of Kibana are running against the same Elasticsearch cluster, unable to authorize user.');
  }

  return {
    username: privilegeCheck.username,
    hasAllRequested: privilegeCheck.has_all_requested,
    privileges: hasPrivileges
  };
};

export function hasPrivilegesWithServer(server) {
  const callWithRequest = getClient(server).callWithRequest;

  const config = server.config();
  const kibanaVersion = config.get('pkg.version');
  const application = config.get('xpack.security.rbac.application');

  return function hasPrivilegesWithRequest(request) {
    return async function hasPrivileges(privileges) {
      const loginPrivilege = getLoginPrivilege();
      const versionPrivilege = getVersionPrivilege(kibanaVersion);

      const allPrivileges = [versionPrivilege, loginPrivilege, ...privileges];
      const privilegesCheck = await hasApplicationPrivileges(
        callWithRequest,
        request,
        kibanaVersion,
        application,
        allPrivileges
      );

      const success = privilegesCheck.hasAllRequested;

      return {
        success,
        // We don't want to expose the version privilege to consumers, as it's an implementation detail only to detect version mismatch
        missing: Object.keys(privilegesCheck.privileges)
          .filter(key => privilegesCheck.privileges[key] === false)
          .filter(p => p !== versionPrivilege),
        // If they're missing the login privilege, they have no application privileges so we'll try to use the legacy fallback
        useLegacyFallback: privilegesCheck.privileges[loginPrivilege] === false,
        username: privilegesCheck.username,
      };
    };
  };
}
