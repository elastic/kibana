/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getClient } from '../../../../../server/lib/get_client_shield';
import { DEFAULT_RESOURCE } from '../../../common/constants';
import { buildPrivilegeMap, getVersionPrivilege, getLoginPrivilege } from '../privileges';

const getMissingPrivileges = (resource, application, privilegeCheck) => {
  const privileges = privilegeCheck.application[application][resource];
  return Object.keys(privileges).filter(key => privileges[key] === false);
};

const hasApplicationPrivileges = async (callWithRequest, request, kibanaVersion, application, privileges) => {
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

  const privilegesResult = privilegeCheck.application[application][DEFAULT_RESOURCE];

  // We include the login privilege on all privileges, so the existence of it and not the version privilege
  // lets us know that we're running in an incorrect configuration. Without the login privilege check, we wouldn't
  // know whether the user just wasn't authorized for this instance of Kibana in general
  if (!privilegesResult[versionPrivilege] && privilegesResult[loginPrivilege]) {
    throw new Error('Multiple versions of Kibana are running against the same Elasticsearch cluster, unable to authorize user.');
  }

  return privilegeCheck;
};

const hasLegacyPrivileges = async (callWithRequest, request, kibanaVersion, application, kibanaIndex, privileges) => {
  const privilegeCheck = await callWithRequest(request, 'shield.hasPrivileges', {
    body: {
      index: [{
        names: [ kibanaIndex ],
        privileges: ['read', 'index']
      }]
    }
  });

  if (privilegeCheck.index[kibanaIndex].index) {
    return {
      username: privilegeCheck.username,
      has_all_requested: true,
      application: {
        [application]: {
          [DEFAULT_RESOURCE]: {
            ...privileges.reduce((acc, name) => {
              acc[name] = true;
              return acc;
            }, {})
          }
        }
      }
    };
  }

  if (privilegeCheck.index[kibanaIndex].read) {
    const privilegeMap = buildPrivilegeMap(application, kibanaVersion);
    const implicitPrivileges = privileges.reduce((acc, name) => {
      acc[name] = privilegeMap[application].read.actions.includes(name);
      return acc;
    }, {});
    return {
      username: privilegeCheck.username,
      has_all_requested: Object.values(implicitPrivileges).every(x => x),
      application: {
        [application]: {
          [DEFAULT_RESOURCE]: implicitPrivileges
        }
      }
    };
  }

  return {
    username: privilegeCheck.username,
    has_all_requested: false,
    application: {
      [application]: {
        [DEFAULT_RESOURCE]: {
          ...privileges.reduce((acc, name) => {
            acc[name] = false;
            return acc;
          }, {})
        }
      }
    }
  };

};

export function hasPrivilegesWithServer(server) {
  const callWithRequest = getClient(server).callWithRequest;

  const config = server.config();
  const kibanaVersion = config.get('pkg.version');
  const application = config.get('xpack.security.rbac.application');
  const kibanaIndex = config.get('kibana.index');

  return function hasPrivilegesWithRequest(request) {
    return async function hasPrivileges(privileges) {

      let privilegeCheck = await hasApplicationPrivileges(callWithRequest, request, kibanaVersion, application, privileges);

      if (!privilegeCheck.application[application][DEFAULT_RESOURCE][getLoginPrivilege()]) {
        privilegeCheck = await hasLegacyPrivileges(
          callWithRequest,
          request,
          kibanaVersion,
          application,
          kibanaIndex,
          [...privileges, getLoginPrivilege()]
        );
      }

      const success = privilegeCheck.has_all_requested;
      const missingPrivileges = getMissingPrivileges(DEFAULT_RESOURCE, application, privilegeCheck);

      return {
        success,
        // We don't want to expose the version privilege to consumers, as it's an implementation detail only to detect version mismatch
        missing: missingPrivileges.filter(p => p !== getVersionPrivilege(kibanaVersion)),
        username: privilegeCheck.username,
      };
    };
  };
}
