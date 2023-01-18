/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { taskStoreMock } from './task_store.mock';
import { BufferedTaskStore } from './buffered_task_store';
import { asErr, asOk } from './lib/result_type';
import { TaskStatus, ConcreteTaskInstance } from './task';

describe('Buffered Task Store', () => {
  test('proxies the TaskStore for `maxAttempts` and `remove`', async () => {
    const taskStore = taskStoreMock.create();
    taskStore.bulkUpdate.mockResolvedValue([]);
    const bufferedStore = new BufferedTaskStore(taskStore, {});

    bufferedStore.remove('1');
    expect(taskStore.remove).toHaveBeenCalledWith('1');
  });

  describe('update', () => {
    test("proxies the TaskStore's `bulkUpdate`", async () => {
      const taskStore = taskStoreMock.create();
      const bufferedStore = new BufferedTaskStore(taskStore, {});

      const task = mockTask();

      taskStore.bulkUpdate.mockResolvedValue([asOk(task)]);

      expect(await bufferedStore.update(task)).toMatchObject(task);
      expect(taskStore.bulkUpdate).toHaveBeenCalledWith([task]);
    });

    test('handles partially successfull bulkUpdates resolving each call appropriately', async () => {
      const taskStore = taskStoreMock.create();
      const bufferedStore = new BufferedTaskStore(taskStore, {});

      const tasks = [
        mockTask(),
        mockTask({ id: 'task_7c149afd-6250-4ca5-a314-20af1348d5e9' }),
        mockTask(),
      ];

      taskStore.bulkUpdate.mockResolvedValueOnce([
        asOk(tasks[0]),
        asErr({
          entity: tasks[1],
          error: {
            type: 'task',
            id: tasks[1].id,
            error: {
              statusCode: 400,
              error: 'Oh no, something went terribly wrong',
              message: 'Oh no, something went terribly wrong',
            },
          },
        }),
        asOk(tasks[2]),
      ]);

      const results = [
        bufferedStore.update(tasks[0]),
        bufferedStore.update(tasks[1]),
        bufferedStore.update(tasks[2]),
      ];
      expect(await results[0]).toMatchObject(tasks[0]);
      expect(results[1]).rejects.toMatchInlineSnapshot(`
        Object {
          "error": Object {
            "error": "Oh no, something went terribly wrong",
            "message": "Oh no, something went terribly wrong",
            "statusCode": 400,
          },
          "id": "task_7c149afd-6250-4ca5-a314-20af1348d5e9",
          "type": "task",
        }
      `);
      expect(await results[2]).toMatchObject(tasks[2]);
    });

    test('handles multiple items with the same id', async () => {
      const taskStore = taskStoreMock.create();
      const bufferedStore = new BufferedTaskStore(taskStore, {});

      const duplicateIdTask = mockTask();
      const tasks = [
        duplicateIdTask,
        mockTask({ id: 'task_16748083-bc28-4599-893b-c8ec16e55c10' }),
        mockTask(),
        { ...mockTask(), id: duplicateIdTask.id },
      ];

      taskStore.bulkUpdate.mockResolvedValueOnce([
        asOk(tasks[0]),
        asErr({
          entity: tasks[1],
          error: {
            type: 'task',
            id: tasks[1].id,
            error: {
              statusCode: 400,
              error: 'Oh no, something went terribly wrong',
              message: 'Oh no, something went terribly wrong',
            },
          },
        }),
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
      expect(results[1]).rejects.toMatchInlineSnapshot(`
        Object {
          "error": Object {
            "error": "Oh no, something went terribly wrong",
            "message": "Oh no, something went terribly wrong",
            "statusCode": 400,
          },
          "id": "task_16748083-bc28-4599-893b-c8ec16e55c10",
          "type": "task",
        }
      `);
      expect(await results[2]).toMatchObject(tasks[2]);
      expect(await results[3]).toMatchObject(tasks[3]);
    });
  });
});

function mockTask(overrides: Partial<ConcreteTaskInstance> = {}): ConcreteTaskInstance {
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
    ...overrides,
  };
}
