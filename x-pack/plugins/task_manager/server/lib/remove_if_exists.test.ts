/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { removeIfExists } from './remove_if_exists';
import { taskStoreMock } from '../task_store.mock';

describe('removeIfExists', () => {
  test('removes the task by its ID', async () => {
    const ts = taskStoreMock.create({});
    const id = uuid.v4();

    expect(await removeIfExists(ts, id)).toBe(undefined);

    expect(ts.remove).toHaveBeenCalledWith(id);
  });

  test('handles 404 errors caused by the task not existing', async () => {
    const ts = taskStoreMock.create({});
    const id = uuid.v4();

    ts.remove.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError('task', id));

    expect(await removeIfExists(ts, id)).toBe(undefined);

    expect(ts.remove).toHaveBeenCalledWith(id);
  });

  test('throws if any other errro is caused by task removal', async () => {
    const ts = taskStoreMock.create({});
    const id = uuid.v4();

    const error = SavedObjectsErrorHelpers.createInvalidVersionError(uuid.v4());
    ts.remove.mockRejectedValue(error);

    expect(removeIfExists(ts, id)).rejects.toBe(error);

    expect(ts.remove).toHaveBeenCalledWith(id);
  });
});
