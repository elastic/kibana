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

export interface UserActionCountByActionType {
  [userActionType: string]: number;
}

// This is a helper method for retrieving user action telemetry data stored via the OSS
// user_action API.
export function fetchUserActions(
  server: Server,
  appName: string,
  actionTypes: string[]
): Promise<UserActionCountByActionType> {
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
    (userActions): UserActionCountByActionType => {
      const userActionCountByActionType = userActions.reduce(
        (byActionType: UserActionCountByActionType, userAction: UserActionRecord | undefined) => {
          // User action is undefined if nobody has performed this action on the client yet.
          if (userAction !== undefined) {
            const { actionType, count } = userAction;
            byActionType[actionType] = count;
          }
          return byActionType;
        },
        {}
      );

      return userActionCountByActionType;
    }
  );
}
