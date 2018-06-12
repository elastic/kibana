/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getClient } from '../../../../../server/lib/get_client_shield';
import { DEFAULT_RESOURCE } from '../../../common/constants';
import { buildPrivilegeMap, getVersionPrivilege, getLoginPrivilege } from '../privileges';

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

const hasLegacyPrivileges = async (deprecationLogger, callWithRequest, request, kibanaVersion, application, kibanaIndex, privileges) => {
  const privilegeCheck = await callWithRequest(request, 'shield.hasPrivileges', {
    body: {
      index: [{
        names: [ kibanaIndex ],
        privileges: ['read', 'index']
      }]
    }
  });

  const createPrivileges = (cb) => {
    return privileges.reduce((acc, name) => {
      acc[name] = cb(name);
      return acc;
    }, {});
  };

  // if they have the index privilege, then we grant them all actions
  if (privilegeCheck.index[kibanaIndex].index) {
    deprecationLogger(
      `Relying on implicit privileges determined from the index privileges is deprecated and will be removed in the next major version`
    );

    const implicitPrivileges = createPrivileges(() => true);
    return {
      username: privilegeCheck.username,
      hasAllRequested: true,
      privileges: implicitPrivileges
    };
  }

  // if they have the read privilege, then we only grant them the read actions
  if (privilegeCheck.index[kibanaIndex].read) {
    deprecationLogger(
      `Relying on implicit privileges determined from the index privileges is deprecated and will be removed in the next major version`
    );
    const privilegeMap = buildPrivilegeMap(application, kibanaVersion);
    const implicitPrivileges = createPrivileges(name => privilegeMap.read.actions.includes(name));

    return {
      username: privilegeCheck.username,
      hasAllRequested: Object.values(implicitPrivileges).every(x => x),
      privileges: implicitPrivileges,
    };
  }

  return {
    username: privilegeCheck.username,
    hasAllRequested: false,
    privileges: createPrivileges(() => false)
  };
};

export function hasPrivilegesWithServer(server) {
  const callWithRequest = getClient(server).callWithRequest;

  const config = server.config();
  const kibanaVersion = config.get('pkg.version');
  const application = config.get('xpack.security.rbac.application');
  const kibanaIndex = config.get('kibana.index');
  const deprecationLogger = (msg) => server.log(['warning', 'deprecated', 'security'], msg);

  return function hasPrivilegesWithRequest(request) {
    return async function hasPrivileges(privileges) {
      const loginPrivilege = getLoginPrivilege();
      const versionPrivilege = getVersionPrivilege(kibanaVersion);

      const allPrivileges = [versionPrivilege, loginPrivilege, ...privileges];
      let privilegesCheck = await hasApplicationPrivileges(
        callWithRequest,
        request,
        kibanaVersion,
        application,
        allPrivileges
      );

      if (!privilegesCheck.privileges[loginPrivilege]) {
        privilegesCheck = await hasLegacyPrivileges(
          deprecationLogger,
          callWithRequest,
          request,
          kibanaVersion,
          application,
          kibanaIndex,
          allPrivileges
        );
      }

      const success = privilegesCheck.hasAllRequested;

      return {
        success,
        // We don't want to expose the version privilege to consumers, as it's an implementation detail only to detect version mismatch
        missing: Object.keys(privilegesCheck.privileges)
          .filter(key => privilegesCheck.privileges[key] === false)
          .filter(p => p !== versionPrivilege),
        username: privilegesCheck.username,
      };
    };
  };
}
