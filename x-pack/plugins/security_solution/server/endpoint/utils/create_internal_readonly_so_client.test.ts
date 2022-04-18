/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SavedObjectsClientContract } from '@kbn/core/server';
import {
  createInternalReadonlySoClient,
  InternalReadonlySoClientMethodNotAllowedError,
} from './create_internal_readonly_so_client';

describe('When using the `createInternalReadonlySoClient`', () => {
  let realSoClientMock: ReturnType<typeof savedObjectsClientMock.create>;
  let readonlySoClient: ReturnType<typeof createInternalReadonlySoClient>;

  beforeEach(() => {
    const soStartContract = savedObjectsServiceMock.createStartContract();
    realSoClientMock = savedObjectsClientMock.create();
    soStartContract.getScopedClient.mockReturnValue(realSoClientMock);
    readonlySoClient = createInternalReadonlySoClient(soStartContract);
  });

  it.each<keyof SavedObjectsClientContract>([
    'get',
    'bulkGet',
    'checkConflicts',
    'collectMultiNamespaceReferences',
    'find',
    'resolve',
  ])('should allow usage of %s() method', (methodName) => {
    expect(() => readonlySoClient[methodName]).not.toThrow();
  });

  it.each<keyof SavedObjectsClientContract>([
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
    expect(() => readonlySoClient[methodName]).toThrow(
      InternalReadonlySoClientMethodNotAllowedError
    );
  });
});
