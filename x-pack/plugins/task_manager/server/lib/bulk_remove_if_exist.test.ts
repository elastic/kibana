/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuid } from 'uuid';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { bulkRemoveIfExist } from './bulk_remove_if_exist';
import { taskStoreMock } from '../task_store.mock';

describe('removeIfExists', () => {
  const ids = [uuid(), uuid()];

  test('removes the tasks by its IDs', async () => {
    const ts = taskStoreMock.create({});

    expect(await bulkRemoveIfExist(ts, ids)).toBe(undefined);
    expect(ts.bulkRemove).toHaveBeenCalledWith(ids);
  });

  test('handles 404 errors caused by the task not existing', async () => {
    const ts = taskStoreMock.create({});

    ts.bulkRemove.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('task', ids[0])
    );

    expect(await bulkRemoveIfExist(ts, ids)).toBe(undefined);
    expect(ts.bulkRemove).toHaveBeenCalledWith(ids);
  });

  test('throws if any other error is caused by task removal', async () => {
    const ts = taskStoreMock.create({});

    const error = SavedObjectsErrorHelpers.createInvalidVersionError(uuid());
    ts.bulkRemove.mockRejectedValue(error);

    expect(bulkRemoveIfExist(ts, ids)).rejects.toBe(error);
    expect(ts.bulkRemove).toHaveBeenCalledWith(ids);
  });
});
