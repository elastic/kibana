/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { difference, isEmpty, isEqual } from 'lodash';
import { buildPrivilegeMap } from './privileges';
import { getClient } from '../../../../../server/lib/get_client_shield';
import { spaceApplicationPrivilegesSerializer } from './space_application_privileges_serializer';

const serializePrivileges = (application, privilegeMap) => {
  return {
    [application]: {
      ...Object.entries(privilegeMap.global).reduce((acc, [privilegeName, privilegeActions]) => {
        acc[privilegeName] = {
          application,
          name: privilegeName,
          actions: privilegeActions,
          metadata: {},
        };
        return acc;
      }, {}),
      ...Object.entries(privilegeMap.space).reduce((acc, [privilegeName, privilegeActions]) => {
        const name = spaceApplicationPrivilegesSerializer.privilege.serialize(privilegeName);
        acc[name] = {
          application,
          name,
          actions: privilegeActions,
          metadata: {},
        };
        return acc;
      }, {})
    }
  };
};

export async function registerPrivilegesWithCluster(server) {

  const { authorization } = server.plugins.security;
  const { types: savedObjectTypes } = server.savedObjects;
  const { actions, application } = authorization;

  const arePrivilegesEqual = (existingPrivileges, expectedPrivileges) => {
    // when comparing privileges, the order of the actions doesn't matter, lodash's isEqual
    // doesn't know how to compare Sets
    return isEqual(existingPrivileges, expectedPrivileges, (value, other, key) => {
      if (key === 'actions' && Array.isArray(value) && Array.isArray(other)) {
        return isEqual(value.sort(), other.sort());
      }
    });
  };

  const getPrivilegesToDelete = (existingPrivileges, expectedPrivileges) => {
    if (isEmpty(existingPrivileges)) {
      return [];
    }

    return difference(Object.keys(existingPrivileges[application]), Object.keys(expectedPrivileges[application]));
  };

  const privilegeMap = buildPrivilegeMap(savedObjectTypes, actions);
  const expectedPrivileges = serializePrivileges(application, privilegeMap);

  server.log(['security', 'debug'], `Registering Kibana Privileges with Elasticsearch for ${application}`);

  const callCluster = getClient(server).callWithInternalUser;

  try {
    // we only want to post the privileges when they're going to change as Elasticsearch has
    // to clear the role cache to get these changes reflected in the _has_privileges API
    const existingPrivileges = await callCluster(`shield.getPrivilege`, { privilege: application });
    if (arePrivilegesEqual(existingPrivileges, expectedPrivileges)) {
      server.log(['security', 'debug'], `Kibana Privileges already registered with Elasticearch for ${application}`);
      return;
    }

    const privilegesToDelete = getPrivilegesToDelete(existingPrivileges, expectedPrivileges);
    for (const privilegeToDelete of privilegesToDelete) {
      server.log(['security', 'debug'], `Deleting Kibana Privilege ${privilegeToDelete} from Elasticearch for ${application}`);
      try {
        await callCluster('shield.deletePrivilege', {
          application,
          privilege: privilegeToDelete
        });
      } catch (err) {
        server.log(['security', 'error'], `Error deleting Kibana Privilege ${privilegeToDelete}`);
        throw err;
      }
    }

    await callCluster('shield.postPrivileges', {
      body: expectedPrivileges
    });
    server.log(['security', 'debug'], `Updated Kibana Privileges with Elasticearch for ${application}`);
  } catch (err) {
    server.log(['security', 'error'], `Error registering Kibana Privileges with Elasticsearch for ${application}: ${err.message}`);
    throw err;
  }
}
