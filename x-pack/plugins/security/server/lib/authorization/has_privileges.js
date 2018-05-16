/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getClient } from '../../../../../server/lib/get_client_shield';
import { DEFAULT_RESOURCE } from '../../../common/constants';
import { getVersionPrivilege, getLoginPrivilege } from '../privileges';

const getMissingPrivileges = (resource, application, privilegeCheck) => {
  const privileges = privilegeCheck.application[application][resource];
  return Object.keys(privileges).filter(key => privileges[key] === false);
};

export function hasPrivilegesWithServer(server) {
  const callWithRequest = getClient(server).callWithRequest;

  const config = server.config();
  const kibanaVersion = config.get('pkg.version');
  const application = config.get('xpack.security.rbac.application');

  return function hasPrivilegesWithRequest(request) {
    return async function hasPrivileges(privileges) {

      const versionPrivilege = getVersionPrivilege(kibanaVersion);
      const loginPrivilege = getLoginPrivilege();

      const privilegeCheck = await callWithRequest(request, 'shield.hasPrivileges', {
        body: {
          applications: [{
            application,
            resources: [DEFAULT_RESOURCE],
            privileges: [versionPrivilege, loginPrivilege, ...privileges]
          }]
        }
      });

      const success = privilegeCheck.has_all_requested;
      const missingPrivileges = getMissingPrivileges(DEFAULT_RESOURCE, application, privilegeCheck);

      // We include the login privilege on all privileges, so the existence of it and not the version privilege
      // lets us know that we're running in an incorrect configuration. Without the login privilege check, we wouldn't
      // know whether the user just wasn't authorized for this instance of Kibana in general
      if (missingPrivileges.includes(versionPrivilege) && !missingPrivileges.includes(loginPrivilege)) {
        throw new Error('Multiple versions of Kibana are running against the same Elasticsearch cluster, unable to authorize user.');
      }

      return {
        success,
        missing: missingPrivileges
      };
    };
  };
}
