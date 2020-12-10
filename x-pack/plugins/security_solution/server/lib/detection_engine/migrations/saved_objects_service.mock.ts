/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsFindResponse } from 'src/core/server';
import { SignalsMigrationSOService } from './saved_objects_service';
import { SignalsMigrationSO, SignalsMigrationSOAttributes } from './saved_objects_schema';
import { signalsMigrationType } from './saved_objects';

export const getSavedObjectResponseMock = (): SignalsMigrationSO => ({
  id: '4a7ff78d-3055-4bb2-ba73-587b9c6c15a4',
  attributes: {
    destinationIndex: 'destinationIndex',
    sourceIndex: 'sourceIndex',
    status: 'success',
    taskId: 'taskid',
    version: 14,
    createdBy: 'rylnd',
    created: '2020-03-27T22:55:59.517Z',
    updatedBy: 'rylnd',
    updated: '2020-03-27T22:55:59.517Z',
  },
  type: signalsMigrationType,
});

export const getSavedObjectFindResponseMock = (
  migrations: SignalsMigrationSO[] = [getSavedObjectResponseMock()]
): SavedObjectsFindResponse<SignalsMigrationSOAttributes> => ({
  total: 1,
  per_page: 1,
  page: 1,
  saved_objects: migrations.map((m) => ({ ...m, score: 0, references: [] })),
});

const create = () =>
  (({
    create: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  } as unknown) as jest.Mocked<SignalsMigrationSOService>);

export const savedObjectServiceMock = { create };
