/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsClientContract,
  SavedObject,
  SavedObjectsUpdateResponse,
  SavedObjectsFindOptions,
  SavedObjectsFindResponse,
} from 'src/core/server';
import { signalsMigrationType } from './saved_objects';
import { SignalsMigrationSOAttributes } from './saved_objects_schema';

export interface SignalsMigrationSOClient {
  find: (
    options?: Omit<SavedObjectsFindOptions, 'type'>
  ) => Promise<SavedObjectsFindResponse<SignalsMigrationSOAttributes>>;
  create: (
    attributes: SignalsMigrationSOAttributes
  ) => Promise<SavedObject<SignalsMigrationSOAttributes>>;
  update: (
    id: string,
    attributes: Partial<SignalsMigrationSOAttributes>
  ) => Promise<SavedObjectsUpdateResponse<SignalsMigrationSOAttributes>>;
  delete: (id: string) => Promise<{}>;
}

export const signalsMigrationSOClient = (
  savedObjectsClient: SavedObjectsClientContract
): SignalsMigrationSOClient => ({
  find: (options) =>
    savedObjectsClient.find<SignalsMigrationSOAttributes>({
      ...options,
      type: signalsMigrationType,
    }),
  create: (attributes) => savedObjectsClient.create(signalsMigrationType, attributes),
  update: (id, attributes) => savedObjectsClient.update(signalsMigrationType, id, attributes),
  delete: (id) => savedObjectsClient.delete(signalsMigrationType, id),
});
