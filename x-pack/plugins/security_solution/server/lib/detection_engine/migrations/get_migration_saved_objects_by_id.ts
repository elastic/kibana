/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { SavedObjectsClientContract } from 'src/core/server';
import { validateEither } from '../../../../common/validate';
import { signalsMigrationSOClient } from './saved_objects_client';
import { SignalsMigrationSO, signalsMigrationSOs } from './saved_objects_schema';

/**
 * Retrieves a list of migrations SOs by their ID
 *
 * @param soClient An {@link SavedObjectsClientContract}
 * @param ids IDs of the migration SOs
 *
 * @returns a list of {@link SignalsMigrationSO[]}
 *
 * @throws if client returns an error
 */
export const getMigrationSavedObjectsById = async ({
  ids,
  soClient,
}: {
  ids: string[];
  soClient: SavedObjectsClientContract;
}): Promise<SignalsMigrationSO[]> => {
  const client = signalsMigrationSOClient(soClient);
  const objects = ids.map((id) => ({ id }));

  return pipe(
    await client.bulkGet(objects),
    (so) => validateEither(signalsMigrationSOs, so.saved_objects),
    fold(
      (e) => Promise.reject(e),
      (a) => Promise.resolve(a)
    )
  );
};
