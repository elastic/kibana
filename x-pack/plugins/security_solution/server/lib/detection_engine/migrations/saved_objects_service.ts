/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { chain, tryCatch } from 'fp-ts/lib/TaskEither';
import { fold } from 'fp-ts/lib/Either';
import { flow } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';

import {
  SavedObjectsClientContract,
  SavedObjectsUpdateResponse,
  SavedObjectsFindOptions,
} from 'src/core/server';
import { signalsMigrationType } from './saved_objects';
import {
  SignalsMigrationSO,
  signalsMigrationSO,
  SignalsMigrationSOAttributes,
  SignalsMigrationSOCreateAttributes,
  signalsMigrationSOCreateAttributes,
  signalsMigrationSOs,
  signalsMigrationSOUpdateAttributes,
  SignalsMigrationSOUpdateAttributes,
} from './saved_objects_schema';
import { validateEither, validateTaskEither } from '../../../../common/validate';
import { toError, toPromise } from './fp_utils';
import { signalsMigrationSOClientFactory } from './saved_objects_client';

export interface SignalsMigrationSOService {
  find: (options?: Omit<SavedObjectsFindOptions, 'type'>) => Promise<SignalsMigrationSO[]>;
  create: (attributes: SignalsMigrationSOCreateAttributes) => Promise<SignalsMigrationSO>;
  update: (
    id: string,
    attributes: SignalsMigrationSOUpdateAttributes
  ) => Promise<SavedObjectsUpdateResponse<SignalsMigrationSOAttributes>>;
  delete: (id: string) => Promise<{}>;
}

const getIsoDateString = () => new Date().toISOString();

const generateAttributes = (username: string) => {
  const now = getIsoDateString();
  return { created: now, createdBy: username, updated: now, updatedBy: username };
};

export const signalsMigrationSOServiceFactory = (
  savedObjectsClient: SavedObjectsClientContract,
  username = 'system'
): SignalsMigrationSOService => {
  const client = signalsMigrationSOClientFactory(savedObjectsClient);

  return {
    find: async (options) =>
      pipe(
        await client.find(options),
        (so) => validateEither(signalsMigrationSOs, so.saved_objects),
        fold(
          (e) => Promise.reject(e),
          (a) => Promise.resolve(a)
        )
      ),

    create: flow(
      (attrs) => validateTaskEither(signalsMigrationSOCreateAttributes, attrs),
      chain((validAttrs) =>
        tryCatch(() => client.create({ ...validAttrs, ...generateAttributes(username) }), toError)
      ),
      chain((so) => validateTaskEither(signalsMigrationSO, so)),
      toPromise
    ),
    update: (id, attributes) =>
      pipe(
        attributes,
        (attrs) => validateTaskEither(signalsMigrationSOUpdateAttributes, attrs),
        chain((validAttrs) =>
          tryCatch(
            () =>
              client.update(id, {
                ...validAttrs,
                updated: getIsoDateString(),
                updatedBy: username,
              }),
            toError
          )
        ),
        toPromise
      ),
    delete: (id) => savedObjectsClient.delete(signalsMigrationType, id),
  };
};
