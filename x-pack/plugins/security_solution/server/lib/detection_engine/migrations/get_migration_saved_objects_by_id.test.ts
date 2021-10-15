/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from 'src/core/server/mocks';
import {
  getSignalsMigrationSavedObjectMock,
  getSignalsMigrationSavedObjectErrorMock,
} from './saved_objects_schema.mock';
import { getMigrationSavedObjectsById } from './get_migration_saved_objects_by_id';

describe('getMigrationSavedObjectsById', () => {
  let ids: string[];
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    ids = ['id1'];
    soClient = savedObjectsClientMock.create();
  });

  it('resolves an array of objects, if valid', async () => {
    soClient.bulkResolve.mockResolvedValue({
      resolved_objects: [
        { saved_object: getSignalsMigrationSavedObjectMock(), outcome: 'exactMatch' },
      ],
    });
    const result = await getMigrationSavedObjectsById({
      ids,
      soClient,
    });

    expect(result).toEqual([getSignalsMigrationSavedObjectMock()]);
  });

  it('rejects if SO client throws', () => {
    const error = new Error('whoops');
    soClient.bulkResolve.mockRejectedValue(error);

    return expect(getMigrationSavedObjectsById({ ids, soClient })).rejects.toThrow(error);
  });

  it('throws a 404 error if the response includes a 404', async () => {
    soClient.bulkResolve.mockResolvedValue({
      resolved_objects: [
        {
          saved_object: getSignalsMigrationSavedObjectErrorMock({
            statusCode: 404,
            message: 'not found',
          }),
          outcome: 'exactMatch',
        },
      ],
    });

    return expect(getMigrationSavedObjectsById({ ids, soClient })).rejects.toThrow(
      expect.objectContaining({ statusCode: 404 })
    );
  });

  it('rejects if response is invalid', () => {
    // @ts-expect-error intentionally breaking the type
    const badSavedObject = getSignalsMigrationSavedObjectMock({ destinationIndex: 4 });
    soClient.bulkResolve.mockResolvedValue({
      resolved_objects: [{ saved_object: badSavedObject, outcome: 'exactMatch' }],
    });

    return expect(() => getMigrationSavedObjectsById({ ids, soClient })).rejects.toThrow(
      'Invalid value "4" supplied to "attributes,destinationIndex"'
    );
  });

  describe('SO resolution error cases', () => {
    it('returns a 409 if a conflict is found', async () => {
      soClient.bulkResolve.mockResolvedValue({
        resolved_objects: [
          {
            saved_object: getSignalsMigrationSavedObjectMock(),
            outcome: 'conflict',
            alias_target_id: 'alias-target-id',
          },
        ],
      });
      return expect(getMigrationSavedObjectsById({ ids, soClient })).rejects.toThrow(
        expect.objectContaining({ statusCode: 409 })
      );
    });

    it('returns a 422 if an alias match is found', () => {
      soClient.bulkResolve.mockResolvedValue({
        resolved_objects: [
          {
            saved_object: getSignalsMigrationSavedObjectMock(),
            outcome: 'aliasMatch',
            alias_target_id: 'alias-target-id',
          },
        ],
      });
      return expect(getMigrationSavedObjectsById({ ids, soClient })).rejects.toThrow(
        expect.objectContaining({ statusCode: 422 })
      );
    });
  });
});
