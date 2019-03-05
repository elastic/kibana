/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';

export interface UserActionRecord {
  actionType: string;
  count: number;
}

export interface UserActionAndCountKeyValuePair {
  key: string;
  value: number;
}

// This is a helper method for retrieving user action telemetry data stored via the OSS
// user_action API.
export function fetchUserActions(
  server: Server,
  appName: string,
  actionTypes: string[]
): Promise<UserActionAndCountKeyValuePair[]> {
  const { SavedObjectsClient, getSavedObjectsRepository } = server.savedObjects;
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
  const internalRepository = getSavedObjectsRepository(callWithInternalUser);
  const savedObjectsClient = new SavedObjectsClient(internalRepository);

  async function fetchUserAction(actionType: string): Promise<UserActionRecord | undefined> {
    try {
      const savedObjectId = `${appName}:${actionType}`;
      const savedObject = await savedObjectsClient.get('user-action', savedObjectId);
      return { actionType, count: savedObject.attributes.count };
    } catch (error) {
      return undefined;
    }
  }

  return Promise.all(actionTypes.map(fetchUserAction)).then(
    (userActions): UserActionAndCountKeyValuePair[] => {
      const userActionAndCountKeyValuePairs = userActions.reduce(
        (pairs: UserActionAndCountKeyValuePair[], userAction: UserActionRecord | undefined) => {
          // User action is undefined if nobody has performed this action on the client yet.
          if (userAction !== undefined) {
            const { actionType, count } = userAction;
            const pair: UserActionAndCountKeyValuePair = { key: actionType, value: count };
            pairs.push(pair);
          }
          return pairs;
        },
        []
      );

      return userActionAndCountKeyValuePairs;
    }
  );
}
