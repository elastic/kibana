/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  savedObjectsServiceMock,
  savedObjectsRepositoryMock,
} from '../../../../../../src/core/server/mocks';
import { ISavedObjectsRepository } from 'kibana/server';
import {
  createReadonlySoRepository,
  ReadonlySoRepositoryMethodNotAllowedError,
} from './create_readonly_so_repository';

describe('When using the `createReadonlySoRepository`', () => {
  let realSoRepoMock: ReturnType<typeof savedObjectsRepositoryMock.create>;
  let readonlySoRepo: ReturnType<typeof createReadonlySoRepository>;

  beforeEach(() => {
    const soStartContract = savedObjectsServiceMock.createStartContract();
    realSoRepoMock = savedObjectsRepositoryMock.create();
    soStartContract.createInternalRepository.mockReturnValue(realSoRepoMock);
    readonlySoRepo = createReadonlySoRepository(soStartContract);
  });

  it.each<keyof ISavedObjectsRepository>([
    'get',
    'bulkGet',
    'checkConflicts',
    'collectMultiNamespaceReferences',
    'find',
    'resolve',
  ])('should allow usage of %s() method', (methodName) => {
    expect(() => readonlySoRepo[methodName]).not.toThrow();
  });

  it.each<keyof ISavedObjectsRepository>([
    'bulkCreate',
    'bulkUpdate',
    'create',
    'createPointInTimeFinder',
    'delete',
    'removeReferencesTo',
    'openPointInTimeForType',
    'closePointInTime',
    'update',
    'updateObjectsSpaces',
  ])('should throw if usage of %s() is attempted', (methodName) => {
    expect(() => readonlySoRepo[methodName]).toThrow(ReadonlySoRepositoryMethodNotAllowedError);
  });
});
