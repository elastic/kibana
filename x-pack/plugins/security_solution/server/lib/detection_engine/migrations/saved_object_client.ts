/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { chain, fromEither, map, tryCatch } from 'fp-ts/lib/TaskEither';
import { flow } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';

import {
  SavedObjectsClientContract,
  SavedObject,
  SavedObjectsUpdateResponse,
  SavedObjectsFindOptions,
  SavedObjectsFindResponse,
} from 'src/core/server';
import { signalsMigrationType } from './saved_object';
import { signalsMigrationSavedObject, SignalsMigrationSOAttributes } from './saved_object_schema';
import { validateEither } from '../../../../common/validate';
// TODO move out
import { toError, toPromise } from '../../../../../lists/public/common/fp_utils';

export interface SignalsMigrationSavedObjectsClient {
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

export const rawRuleStatusSavedObjectsClientFactory = (
  savedObjectsClient: SavedObjectsClientContract
): SignalsMigrationSavedObjectsClient => ({
  find: (options) =>
    savedObjectsClient.find<SignalsMigrationSOAttributes>({
      ...options,
      type: signalsMigrationType,
    }),
  create: (attributes) => savedObjectsClient.create(signalsMigrationType, attributes),
  update: (id, attributes) => savedObjectsClient.update(signalsMigrationType, id, attributes),
  delete: (id) => savedObjectsClient.delete(signalsMigrationType, id),
});

export const ruleStatusSavedObjectsClientFactory = (
  savedObjectsClient: SavedObjectsClientContract
): SignalsMigrationSavedObjectsClient => ({
  find: (options) =>
    pipe(
      () => rawRuleStatusSavedObjectsClientFactory(savedObjectsClient).find(options),
      (s) => tryCatch(s, toError),
      chain((so) => fromEither(validateEither(signalsMigrationSavedObject, so))),
      toPromise
    ),

  create: (attributes) => savedObjectsClient.create(signalsMigrationType, attributes),
  update: (id, attributes) => savedObjectsClient.update(signalsMigrationType, id, attributes),
  delete: (id) => savedObjectsClient.delete(signalsMigrationType, id),
});
