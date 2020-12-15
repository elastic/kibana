/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { SavedObjectsClientContract, SavedObjectsFindOptions } from 'src/core/server';
import { signalsMigrationSOClient } from './saved_objects_client';
import { SignalsMigrationSO, signalsMigrationSOs } from './saved_objects_schema';
import { validateEither } from '../../../../common/validate';

export const findMigrationSavedObjects = async ({
  options,
  soClient,
}: {
  options?: Omit<SavedObjectsFindOptions, 'type'>;
  soClient: SavedObjectsClientContract;
}): Promise<SignalsMigrationSO[]> => {
  const client = signalsMigrationSOClient(soClient);

  return pipe(
    await client.find(options),
    (so) => validateEither(signalsMigrationSOs, so.saved_objects),
    fold(
      (e) => Promise.reject(e),
      (a) => Promise.resolve(a)
    )
  );
};
