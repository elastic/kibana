/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { difference, isEmpty, isEqual } from 'lodash';
import { buildPrivilegeMap } from './privileges';
import { getClient } from '../../../../../server/lib/get_client_shield';

export async function registerPrivilegesWithCluster(server) {

  const { authorization } = server.plugins.security;
  const { types: savedObjectTypes } = server.savedObjects;
  const { actions, application } = authorization;

  const shouldRemovePrivileges = (existingPrivileges, expectedPrivileges) => {
    if (isEmpty(existingPrivileges)) {
      return false;
    }

    return difference(Object.keys(existingPrivileges[application]), Object.keys(expectedPrivileges[application])).length > 0;
  };

  const expectedPrivileges = {
    [application]: buildPrivilegeMap(savedObjectTypes, application, actions)
  };

  server.log(['security', 'debug'], `Registering Kibana Privileges with Elasticsearch for ${application}`);

  const callCluster = getClient(server).callWithInternalUser;

  try {
    // we only want to post the privileges when they're going to change as Elasticsearch has
    // to clear the role cache to get these changes reflected in the _has_privileges API
    const existingPrivileges = await callCluster(`shield.getPrivilege`, { privilege: application });
    if (isEqual(existingPrivileges, expectedPrivileges)) {
      server.log(['security', 'debug'], `Kibana Privileges already registered with Elasticearch for ${application}`);
      return;
    }

    // The ES privileges POST endpoint only allows us to add new privileges, or update specified privileges; it doesn't
    // remove unspecified privileges. We don't currently have a need to remove privileges, as this would be a
    // backwards compatibility issue, and we'd have to figure out how to migrate roles, so we're throwing an Error if we
    // unintentionally get ourselves in this position.
    if (shouldRemovePrivileges(existingPrivileges, expectedPrivileges)) {
      throw new Error(`Privileges are missing and can't be removed, currently.`);
    }

    server.log(['security', 'debug'], `Updated Kibana Privileges with Elasticearch for ${application}`);
    await callCluster('shield.postPrivileges', {
      body: expectedPrivileges
    });
  } catch (err) {
    server.log(['security', 'error'], `Error registering Kibana Privileges with Elasticsearch for ${application}: ${err.message}`);
    throw err;
  }
}
