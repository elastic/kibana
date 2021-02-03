/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { chain, tryCatch } from 'fp-ts/lib/TaskEither';
import { pipe } from 'fp-ts/lib/pipeable';

import { SavedObjectsClientContract, SavedObjectsUpdateResponse } from 'src/core/server';
import { validateTaskEither } from '../../../../common/validate';
import { toError, toPromise } from '../../../../common/fp_utils';
import { signalsMigrationSOClient } from './saved_objects_client';
import {
  SignalsMigrationSOUpdateAttributes,
  signalsMigrationSOUpdateAttributes,
} from './saved_objects_schema';
import { getIsoDateString } from './helpers';

export const updateMigrationSavedObject = async ({
  attributes,
  id,
  username,
  soClient,
}: {
  attributes: SignalsMigrationSOUpdateAttributes;
  id: string;
  username: string;
  soClient: SavedObjectsClientContract;
}): Promise<SavedObjectsUpdateResponse<SignalsMigrationSOUpdateAttributes>> => {
  const client = signalsMigrationSOClient(soClient);

  return pipe(
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
  );
};
