/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { MigrationTask } from '../types';
import { EncryptedSavedObjectsClient } from '../../../../../encrypted_saved_objects/server';
import { Logger } from '../../../../../../../src/core/server';

export interface UpdateThroughJoinOptions<T> {
  logger: Logger;
  defineJoin: MigrationTask<T>['defineJoin'];
  savedObjectsClient: SavedObjectsClientContract;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient | undefined;
}

export const updateThroughJoin = async <T>({
  logger,
  defineJoin,
  savedObjectsClient,
  encryptedSavedObjectsClient,
}: UpdateThroughJoinOptions<T>): Promise<void> => {
  if (defineJoin != null) {
    const { type, join } = defineJoin;
    const finder = savedObjectsClient.createPointInTimeFinder<T>({
      perPage: 100,
      type,
    });
    for await (const finderResponse of finder.find()) {
      const { saved_objects: savedObjects } = finderResponse;
      for (const savedObject of savedObjects) {
        const promiseJoins = await Promise.all(join({ logger, savedObject, savedObjectsClient }));
        const mapped = promiseJoins.map((promiseJoin) => promiseJoin.saved_object);
        const updates = await defineJoin.updateObjects({
          logger,
          joins: mapped,
          savedObject,
          encryptedSavedObjectsClient,
        });
        await savedObjectsClient.bulkUpdate(updates);
      }
    }
  }
};
