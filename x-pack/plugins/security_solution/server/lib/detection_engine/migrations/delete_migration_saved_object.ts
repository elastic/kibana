/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { signalsMigrationSOClient } from './saved_objects_client';

export const deleteMigrationSavedObject = async ({
  id,
  soClient,
}: {
  id: string;
  soClient: SavedObjectsClientContract;
}): Promise<{}> => signalsMigrationSOClient(soClient).delete(id);
