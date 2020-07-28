/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { taskManagerMock } from '../../../task_manager/server/mocks';
import { SavedObjectsErrorHelpers } from '../../../../../src/core/server';
import { deleteTaskIfItExists } from './delete_task_if_it_exists';

describe('deleteTaskIfItExists', () => {
  test('removes the task by its ID', async () => {
    const tm = taskManagerMock.createStart();
    const id = uuid.v4();

    expect(await deleteTaskIfItExists(tm, id)).toBe(undefined);

    expect(tm.remove).toHaveBeenCalledWith(id);
  });

  test('handles 404 errors caused by the task not existing', async () => {
    const tm = taskManagerMock.createStart();
    const id = uuid.v4();

    tm.remove.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError('task', id));

    expect(await deleteTaskIfItExists(tm, id)).toBe(undefined);

    expect(tm.remove).toHaveBeenCalledWith(id);
  });

  test('throws if any other errro is caused by task removal', async () => {
    const tm = taskManagerMock.createStart();
    const id = uuid.v4();

    const error = SavedObjectsErrorHelpers.createInvalidVersionError(uuid.v4());
    tm.remove.mockRejectedValue(error);

    expect(deleteTaskIfItExists(tm, id)).rejects.toBe(error);

    expect(tm.remove).toHaveBeenCalledWith(id);
  });
});
