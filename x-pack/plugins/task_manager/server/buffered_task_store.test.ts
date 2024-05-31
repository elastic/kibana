/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskStoreMock } from './task_store.mock';
import { BufferedTaskStore } from './buffered_task_store';
import { asErr, asOk } from './lib/result_type';
import { taskManagerMock } from './mocks';

describe('Buffered Task Store', () => {
  describe('remove', () => {
    test(`proxies the TaskStore's and "bulkRemove"`, async () => {
      const taskStore = taskStoreMock.create();
      const bufferedStore = new BufferedTaskStore(taskStore, {});

      taskStore.bulkRemove.mockResolvedValue({
        statuses: [{ id: '1', type: 'task', success: true }],
      });

      await expect(bufferedStore.remove('1')).resolves.toBeUndefined();
      expect(taskStore.bulkRemove).toHaveBeenCalledTimes(1);
      expect(taskStore.bulkRemove).toHaveBeenCalledWith(['1']);
    });

    test(`handles partially successfull bulkRemove resolving each call appropriately`, async () => {
      const taskStore = taskStoreMock.create();
      const bufferedStore = new BufferedTaskStore(taskStore, {});

      taskStore.bulkRemove.mockResolvedValue({
        statuses: [
          { id: '1', type: 'task', success: true },
          {
            id: '2',
            type: 'task',
            success: false,
            error: { error: 'foo', statusCode: 400, message: 'foo' },
          },
          { id: '3', type: 'task', success: true },
        ],
      });

      const results = [
        bufferedStore.remove('1'),
        bufferedStore.remove('2'),
        bufferedStore.remove('3'),
      ];

      await expect(results[0]).resolves.toBeUndefined();
      await expect(results[1]).rejects.toMatchInlineSnapshot(`
        Object {
          "error": Object {
            "error": "foo",
            "message": "foo",
            "statusCode": 400,
          },
          "id": "2",
          "type": "task",
        }
      `);
      await expect(results[2]).resolves.toBeUndefined();
    });
  });

  describe('update', () => {
    test("proxies the TaskStore's `bulkUpdate`", async () => {
      const taskStore = taskStoreMock.create();
      const bufferedStore = new BufferedTaskStore(taskStore, {});

      const task = taskManagerMock.createTask();

      taskStore.bulkUpdate.mockResolvedValue([asOk(task)]);

      expect(await bufferedStore.update(task, { validate: true })).toMatchObject(task);
      expect(taskStore.bulkUpdate).toHaveBeenCalledWith([task], { validate: false });

      expect(taskStore.taskValidator.getValidatedTaskInstanceForUpdating).toHaveBeenCalledTimes(1);
      expect(taskStore.taskValidator.getValidatedTaskInstanceFromReading).toHaveBeenCalledTimes(1);
      expect(taskStore.taskValidator.getValidatedTaskInstanceForUpdating).toHaveBeenCalledWith(
        task,
        { validate: true }
      );
      expect(taskStore.taskValidator.getValidatedTaskInstanceFromReading).toHaveBeenCalledWith(
        task,
        { validate: true }
      );
    });

    test(`doesn't validate when specified`, async () => {
      const taskStore = taskStoreMock.create();
      const bufferedStore = new BufferedTaskStore(taskStore, {});

      const task = taskManagerMock.createTask();

      taskStore.bulkUpdate.mockResolvedValue([asOk(task)]);

      expect(await bufferedStore.update(task, { validate: false })).toMatchObject(task);
      expect(taskStore.bulkUpdate).toHaveBeenCalledWith([task], { validate: false });

      expect(taskStore.taskValidator.getValidatedTaskInstanceForUpdating).toHaveBeenCalledWith(
        task,
        { validate: false }
      );
    });

    test('handles partially successfull bulkUpdates resolving each call appropriately', async () => {
      const taskStore = taskStoreMock.create();
      const bufferedStore = new BufferedTaskStore(taskStore, {});

      const tasks = [
        taskManagerMock.createTask(),
        taskManagerMock.createTask({ id: 'task_7c149afd-6250-4ca5-a314-20af1348d5e9' }),
        taskManagerMock.createTask(),
      ];

      taskStore.bulkUpdate.mockResolvedValueOnce([
        asOk(tasks[0]),
        asErr({
          type: 'task',
          id: tasks[1].id,
          error: {
            statusCode: 400,
            error: 'Oh no, something went terribly wrong',
            message: 'Oh no, something went terribly wrong',
          },
        }),
        asOk(tasks[2]),
      ]);

      const results = [
        bufferedStore.update(tasks[0], { validate: true }),
        bufferedStore.update(tasks[1], { validate: true }),
        bufferedStore.update(tasks[2], { validate: true }),
      ];
      expect(await results[0]).toMatchObject(tasks[0]);
      await expect(results[1]).rejects.toMatchInlineSnapshot(`
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

      const duplicateIdTask = taskManagerMock.createTask();
      const tasks = [
        duplicateIdTask,
        taskManagerMock.createTask({ id: 'task_16748083-bc28-4599-893b-c8ec16e55c10' }),
        taskManagerMock.createTask(),
        taskManagerMock.createTask({ id: duplicateIdTask.id }),
      ];

      taskStore.bulkUpdate.mockResolvedValueOnce([
        asOk(tasks[0]),
        asErr({
          type: 'task',
          id: tasks[1].id,
          error: {
            statusCode: 400,
            error: 'Oh no, something went terribly wrong',
            message: 'Oh no, something went terribly wrong',
          },
        }),
        asOk(tasks[2]),
        asOk(tasks[3]),
      ]);

      const results = [
        bufferedStore.update(tasks[0], { validate: true }),
        bufferedStore.update(tasks[1], { validate: true }),
        bufferedStore.update(tasks[2], { validate: true }),
        bufferedStore.update(tasks[3], { validate: true }),
      ];
      expect(await results[0]).toMatchObject(tasks[0]);
      await expect(results[1]).rejects.toMatchInlineSnapshot(`
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
