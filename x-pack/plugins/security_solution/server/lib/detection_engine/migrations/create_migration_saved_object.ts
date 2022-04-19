/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chain, tryCatch } from 'fp-ts/lib/TaskEither';
import { pipe } from 'fp-ts/lib/pipeable';

import { SavedObjectsClientContract } from '@kbn/core/server';
import { validateTaskEither } from '@kbn/securitysolution-io-ts-utils';
import { toError, toPromise } from '@kbn/securitysolution-list-api';
import { signalsMigrationSOClient } from './saved_objects_client';
import {
  signalsMigrationSO,
  SignalsMigrationSO,
  signalsMigrationSOCreateAttributes,
  SignalsMigrationSOCreateAttributes,
} from './saved_objects_schema';
import { getIsoDateString } from './helpers';

const generateAttributes = (username: string) => {
  const now = getIsoDateString();
  return { created: now, createdBy: username, updated: now, updatedBy: username };
};

export const createMigrationSavedObject = async ({
  attributes,
  soClient,
  username,
}: {
  attributes: SignalsMigrationSOCreateAttributes;
  soClient: SavedObjectsClientContract;
  username: string;
}): Promise<SignalsMigrationSO> => {
  const client = signalsMigrationSOClient(soClient);

  return pipe(
    attributes,
    (attrs) => validateTaskEither(signalsMigrationSOCreateAttributes, attrs),
    chain((validAttrs) =>
      tryCatch(() => client.create({ ...validAttrs, ...generateAttributes(username) }), toError)
    ),
    chain((so) => validateTaskEither(signalsMigrationSO, so)),
    toPromise
  );
};
