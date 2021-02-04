/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, isEqualWith, difference } from 'lodash';
import { IClusterClient, Logger } from '../../../../../src/core/server';

import { serializePrivileges } from './privileges_serializer';
import { PrivilegesService } from './privileges';

export async function registerPrivilegesWithCluster(
  logger: Logger,
  privileges: PrivilegesService,
  application: string,
  clusterClient: IClusterClient
) {
  const arePrivilegesEqual = (
    existingPrivileges: Record<string, unknown>,
    expectedPrivileges: Record<string, unknown>
  ) => {
    // when comparing privileges, the order of the actions doesn't matter, lodash's isEqual
    // doesn't know how to compare Sets
    return isEqualWith(existingPrivileges, expectedPrivileges, (value, other, key) => {
      if (key === 'actions' && Array.isArray(value) && Array.isArray(other)) {
        // Array.sort() is in-place, and we don't want to be modifying the actual order
        // of the arrays permanently, and there's potential they're frozen, so we're copying
        // before comparing.
        return isEqual([...value].sort(), [...other].sort());
      }

      // Lodash types aren't correct, `undefined` should be supported as a return value here and it
      // has special meaning.
      return undefined as any;
    });
  };

  const getPrivilegesToDelete = (
    existingPrivileges: Record<string, object>,
    expectedPrivileges: Record<string, object>
  ) => {
    if (Object.keys(existingPrivileges).length === 0) {
      return [];
    }

    return difference(
      Object.keys(existingPrivileges[application]),
      Object.keys(expectedPrivileges[application])
    );
  };

  const expectedPrivileges = serializePrivileges(application, privileges.get());

  logger.debug(`Registering Kibana Privileges with Elasticsearch for ${application}`);

  try {
    // we only want to post the privileges when they're going to change as Elasticsearch has
    // to clear the role cache to get these changes reflected in the _has_privileges API
    const { body: existingPrivileges } = await clusterClient.asInternalUser.security.getPrivileges<
      Record<string, object>
    >({ application });
    if (arePrivilegesEqual(existingPrivileges, expectedPrivileges)) {
      logger.debug(`Kibana Privileges already registered with Elasticsearch for ${application}`);
      return;
    }

    const privilegesToDelete = getPrivilegesToDelete(existingPrivileges, expectedPrivileges);
    for (const privilegeToDelete of privilegesToDelete) {
      logger.debug(
        `Deleting Kibana Privilege ${privilegeToDelete} from Elasticsearch for ${application}`
      );
      try {
        await clusterClient.asInternalUser.security.deletePrivileges({
          application,
          name: privilegeToDelete,
        });
      } catch (err) {
        logger.error(`Error deleting Kibana Privilege ${privilegeToDelete}`);
        throw err;
      }
    }

    await clusterClient.asInternalUser.security.putPrivileges({ body: expectedPrivileges });
    logger.debug(`Updated Kibana Privileges with Elasticsearch for ${application}`);
  } catch (err) {
    logger.error(
      `Error registering Kibana Privileges with Elasticsearch for ${application}: ${err.message}`
    );
    throw err;
  }
}
