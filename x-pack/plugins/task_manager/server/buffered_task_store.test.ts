/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { taskStoreMock } from './task_store.mock';
import { BufferedTaskStore } from './buffered_task_store';
import { asErr, asOk } from './lib/result_type';
import { TaskStatus } from './task';

describe('Buffered Task Store', () => {
  test('proxies the TaskStore for `maxAttempts` and `remove`', async () => {
    const taskStore = taskStoreMock.create({ maxAttempts: 10 });
    taskStore.bulkUpdate.mockResolvedValue([]);
    const bufferedStore = new BufferedTaskStore(taskStore, {});

    expect(bufferedStore.maxAttempts).toEqual(10);

    bufferedStore.remove('1');
    expect(taskStore.remove).toHaveBeenCalledWith('1');
  });

  describe('update', () => {
    test("proxies the TaskStore's `bulkUpdate`", async () => {
      const taskStore = taskStoreMock.create({ maxAttempts: 10 });
      const bufferedStore = new BufferedTaskStore(taskStore, {});

      const task = mockTask();

      taskStore.bulkUpdate.mockResolvedValue([asOk(task)]);

      expect(await bufferedStore.update(task)).toMatchObject(task);
      expect(taskStore.bulkUpdate).toHaveBeenCalledWith([task]);
    });

    test('handles partially successfull bulkUpdates resolving each call appropriately', async () => {
      const taskStore = taskStoreMock.create({ maxAttempts: 10 });
      const bufferedStore = new BufferedTaskStore(taskStore, {});

      const tasks = [mockTask(), mockTask(), mockTask()];

      taskStore.bulkUpdate.mockResolvedValueOnce([
        asOk(tasks[0]),
        asErr({ entity: tasks[1], error: new Error('Oh no, something went terribly wrong') }),
        asOk(tasks[2]),
      ]);

      const results = [
        bufferedStore.update(tasks[0]),
        bufferedStore.update(tasks[1]),
        bufferedStore.update(tasks[2]),
      ];
      expect(await results[0]).toMatchObject(tasks[0]);
      expect(results[1]).rejects.toMatchInlineSnapshot(
        `[Error: Oh no, something went terribly wrong]`
      );
      expect(await results[2]).toMatchObject(tasks[2]);
    });

    test('handles multiple items with the same id', async () => {
      const taskStore = taskStoreMock.create({ maxAttempts: 10 });
      const bufferedStore = new BufferedTaskStore(taskStore, {});

      const duplicateIdTask = mockTask();
      const tasks = [
        duplicateIdTask,
        mockTask(),
        mockTask(),
        { ...mockTask(), id: duplicateIdTask.id },
      ];

      taskStore.bulkUpdate.mockResolvedValueOnce([
        asOk(tasks[0]),
        asErr({ entity: tasks[1], error: new Error('Oh no, something went terribly wrong') }),
        asOk(tasks[2]),
        asOk(tasks[3]),
      ]);

      const results = [
        bufferedStore.update(tasks[0]),
        bufferedStore.update(tasks[1]),
        bufferedStore.update(tasks[2]),
        bufferedStore.update(tasks[3]),
      ];
      expect(await results[0]).toMatchObject(tasks[0]);
      expect(results[1]).rejects.toMatchInlineSnapshot(
        `[Error: Oh no, something went terribly wrong]`
      );
      expect(await results[2]).toMatchObject(tasks[2]);
      expect(await results[3]).toMatchObject(tasks[3]);
    });
  });
});

function mockTask() {
  return {
    id: `task_${uuid.v4()}`,
    attempts: 0,
    schedule: undefined,
    params: { hello: 'world' },
    retryAt: null,
    runAt: new Date(),
    scheduledAt: new Date(),
    scope: undefined,
    startedAt: null,
    state: { foo: 'bar' },
    status: TaskStatus.Idle,
    taskType: 'report',
    user: undefined,
    version: '123',
    ownerId: '123',
  };
}
