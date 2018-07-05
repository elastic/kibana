/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getClient } from '../../../../../server/lib/get_client_shield';
import { ALL_RESOURCE } from '../../../common/constants';
import { getVersionAction, getLoginAction } from '../privileges';

export const CHECK_PRIVILEGES_RESULT = {
  UNAUTHORIZED: Symbol(),
  AUTHORIZED: Symbol(),
  LEGACY: Symbol(),
};

export function checkPrivilegesWithRequestFactory(server) {
  const callWithRequest = getClient(server).callWithRequest;

  const config = server.config();
  const kibanaVersion = config.get('pkg.version');
  const application = config.get('xpack.security.rbac.application');
  const kibanaIndex = config.get('kibana.index');

  const loginAction = getLoginAction();
  const versionAction = getVersionAction(kibanaVersion);

  return function checkPrivilegesWithRequest(request) {

    const checkApplicationPrivileges = async (privileges) => {
      const privilegeCheck = await callWithRequest(request, 'shield.hasPrivileges', {
        body: {
          applications: [{
            application,
            resources: [ALL_RESOURCE],
            privileges
          }]
        }
      });

      const hasPrivileges = privilegeCheck.application[application][ALL_RESOURCE];

      // We include the login action in all privileges, so the existence of it and not the version privilege
      // lets us know that we're running in an incorrect configuration. Without the login privilege check, we wouldn't
      // know whether the user just wasn't authorized for this instance of Kibana in general
      if (!hasPrivileges[getVersionAction(kibanaVersion)] && hasPrivileges[getLoginAction()]) {
        throw new Error('Multiple versions of Kibana are running against the same Elasticsearch cluster, unable to authorize user.');
      }

      return {
        username: privilegeCheck.username,
        hasAllRequested: privilegeCheck.has_all_requested,
        privileges: hasPrivileges
      };
    };

    const hasPrivilegesOnKibanaIndex = async () => {
      const privilegeCheck = await callWithRequest(request, 'shield.hasPrivileges', {
        body: {
          index: [{
            names: [kibanaIndex],
            privileges: ['create', 'delete', 'read', 'view_index_metadata']
          }]
        }
      });

      return Object.values(privilegeCheck.index[kibanaIndex]).includes(true);
    };

    return async function checkPrivileges(privileges) {
      const allPrivileges = [versionAction, loginAction, ...privileges];
      const applicationPrivilegesCheck = await checkApplicationPrivileges(allPrivileges);

      const username = applicationPrivilegesCheck.username;

      // We don't want to expose the version privilege to consumers, as it's an implementation detail only to detect version mismatch
      const missing = Object.keys(applicationPrivilegesCheck.privileges)
        .filter(p => !applicationPrivilegesCheck.privileges[p])
        .filter(p => p !== versionAction);

      if (applicationPrivilegesCheck.hasAllRequested) {
        return {
          result: CHECK_PRIVILEGES_RESULT.AUTHORIZED,
          username,
          missing,
        };
      }

      if (!applicationPrivilegesCheck.privileges[loginAction] && await hasPrivilegesOnKibanaIndex()) {
        const msg = 'Relying on index privileges is deprecated and will be removed in Kibana 7.0';
        server.log(['warning', 'deprecated', 'security'], msg);

        return {
          result: CHECK_PRIVILEGES_RESULT.LEGACY,
          username,
          missing,
        };
      }

      return {
        result: CHECK_PRIVILEGES_RESULT.UNAUTHORIZED,
        username,
        missing,
      };
    };
  };
}
