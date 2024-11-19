/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockLogger } from '../test_utils';

import { createBuffer, Entity, ErrorOutput, BulkOperation } from './bulk_operation_buffer';
import { mapErr, asOk, asErr, Ok, Err } from './result_type';

interface TaskInstance extends Entity {
  attempts: number;
}

const createTask = (function (): () => TaskInstance {
  let counter = 0;
  return () => ({
    id: `task ${++counter}`,
    attempts: 1,
  });
})();

function incrementAttempts(task: TaskInstance): Ok<TaskInstance> {
  return asOk({
    ...task,
    attempts: task.attempts + 1,
  });
}

function errorAttempts(task: TaskInstance): Err<ErrorOutput> {
  return asErr({
    type: 'task',
    id: task.id,
    error: { error: '', message: 'Oh no, something went terribly wrong', statusCode: 500 },
  });
}

describe('Bulk Operation Buffer', () => {
  describe('createBuffer()', () => {
    test('batches up multiple Operation calls', async () => {
      const bulkUpdate: jest.Mocked<BulkOperation<TaskInstance>> = jest.fn(([task1, task2]) => {
        return Promise.resolve([incrementAttempts(task1), incrementAttempts(task2)]);
      });

      const bufferedUpdate = createBuffer(bulkUpdate, {});

      const task1 = createTask();
      const task2 = createTask();

      expect(await Promise.all([bufferedUpdate(task1), bufferedUpdate(task2)])).toMatchObject([
        incrementAttempts(task1),
        incrementAttempts(task2),
      ]);
      expect(bulkUpdate).toHaveBeenCalledWith([task1, task2]);
    });

    test('batch updates can be customised to execute after a certain period', async () => {
      const bulkUpdate: jest.Mocked<BulkOperation<TaskInstance>> = jest.fn((tasks) => {
        return Promise.resolve(tasks.map(incrementAttempts));
      });

      const bufferMaxDuration = 50;
      const bufferedUpdate = createBuffer(bulkUpdate, { bufferMaxDuration });

      const task1 = createTask();
      const task2 = createTask();
      const task3 = createTask();
      const task4 = createTask();

      await Promise.all([bufferedUpdate(task1), bufferedUpdate(task2)]);
      expect(bulkUpdate).toHaveBeenCalledTimes(1);
      expect(bulkUpdate).toHaveBeenCalledWith([task1, task2]);
      expect(bulkUpdate).not.toHaveBeenCalledWith([task3, task4]);

      await new Promise<void>((resolve) => setTimeout(resolve, bufferMaxDuration * 1.1));
      // on next tick
      expect(bulkUpdate).toHaveBeenCalledTimes(1);
      await Promise.all([bufferedUpdate(task3), bufferedUpdate(task4)]);
      expect(bulkUpdate).toHaveBeenCalledTimes(2);
      expect(bulkUpdate).toHaveBeenCalledWith([task3, task4]);

      await new Promise<void>((resolve) => setTimeout(resolve, bufferMaxDuration * 1.1));
      // on next tick
      expect(bulkUpdate).toHaveBeenCalledTimes(2);
    });

    test('batch updates are executed once queue hits a certain bound', async () => {
      const bulkUpdate: jest.Mocked<BulkOperation<TaskInstance>> = jest.fn((tasks) => {
        return Promise.resolve(tasks.map(incrementAttempts));
      });

      const bufferMaxDuration = 1000;
      const bufferedUpdate = createBuffer(bulkUpdate, {
        bufferMaxDuration,
        bufferMaxOperations: 2,
      });

      const task1 = createTask();
      const task2 = createTask();
      const task3 = createTask();
      const task4 = createTask();
      const task5 = createTask();

      await Promise.all([
        bufferedUpdate(task1),
        bufferedUpdate(task2),
        bufferedUpdate(task3),
        bufferedUpdate(task4),
      ]);
      expect(bulkUpdate).toHaveBeenCalledTimes(2);
      expect(bulkUpdate).toHaveBeenCalledWith([task1, task2]);
      expect(bulkUpdate).toHaveBeenCalledWith([task3, task4]);

      await bufferedUpdate(task5);
      expect(bulkUpdate).toHaveBeenCalledTimes(3);
      expect(bulkUpdate).toHaveBeenCalledWith([task5]);
    });

    test('queue upper bound is reset after each flush', async () => {
      const bulkUpdate: jest.Mocked<BulkOperation<TaskInstance>> = jest.fn((tasks) => {
        return Promise.resolve(tasks.map(incrementAttempts));
      });

      const bufferMaxDuration = 100;
      const bufferedUpdate = createBuffer(bulkUpdate, {
        bufferMaxDuration,
        bufferMaxOperations: 3,
      });

      const task1 = createTask();
      const task2 = createTask();
      const task3 = createTask();
      const task4 = createTask();

      await Promise.all([bufferedUpdate(task1), bufferedUpdate(task2)]);
      expect(bulkUpdate).toHaveBeenCalledTimes(1);
      expect(bulkUpdate).toHaveBeenCalledWith([task1, task2]);

      const futureUpdates = Promise.all([bufferedUpdate(task3), bufferedUpdate(task4)]);
      await new Promise<void>((resolve) => setTimeout(resolve, bufferMaxDuration / 2));
      expect(bulkUpdate).toHaveBeenCalledTimes(1);

      await futureUpdates;
      expect(bulkUpdate).toHaveBeenCalledTimes(2);
      expect(bulkUpdate).toHaveBeenCalledWith([task3, task4]);
    });

    test('handles both resolutions and rejections at individual task level', async () => {
      const bulkUpdate: jest.Mocked<BulkOperation<TaskInstance>> = jest.fn(
        ([task1, task2, task3]) => {
          return Promise.resolve([
            incrementAttempts(task1),
            errorAttempts(task2),
            incrementAttempts(task3),
          ]);
        }
      );

      const bufferedUpdate = createBuffer(bulkUpdate, {});

      const task1 = createTask();
      const task2 = createTask();
      const task3 = createTask();

      await Promise.all([
        expect(bufferedUpdate(task1)).resolves.toMatchObject(incrementAttempts(task1)),
        expect(bufferedUpdate(task2)).rejects.toMatchObject(
          mapErr((err: ErrorOutput) => asErr(err), errorAttempts(task2))
        ),
        expect(bufferedUpdate(task3)).resolves.toMatchObject(incrementAttempts(task3)),
      ]);

      expect(bulkUpdate).toHaveBeenCalledTimes(1);
    });

    test('handles bulkUpdate failure', async () => {
      const bulkUpdate: jest.Mocked<BulkOperation<TaskInstance>> = jest.fn(() => {
        return Promise.reject(new Error('bulkUpdate is an illusion'));
      });

      const bufferedUpdate = createBuffer(bulkUpdate, {});

      const task1 = createTask();
      const task2 = createTask();
      const task3 = createTask();

      await Promise.all([
        expect(bufferedUpdate(task1)).rejects.toMatchInlineSnapshot(`
            Object {
              "error": [Error: bulkUpdate is an illusion],
              "tag": "err",
            }
          `),
        expect(bufferedUpdate(task2)).rejects.toMatchInlineSnapshot(`
            Object {
              "error": [Error: bulkUpdate is an illusion],
              "tag": "err",
            }
          `),
        expect(bufferedUpdate(task3)).rejects.toMatchInlineSnapshot(`
            Object {
              "error": [Error: bulkUpdate is an illusion],
              "tag": "err",
            }
          `),
      ]);

      expect(bulkUpdate).toHaveBeenCalledTimes(1);
    });

    test('logs unknown bulk operation results', async () => {
      const bulkUpdate: jest.Mocked<BulkOperation<TaskInstance>> = jest.fn(
        ([task1, task2, task3]) => {
          return Promise.resolve([
            incrementAttempts(task1),
            errorAttempts(createTask()),
            incrementAttempts(createTask()),
          ]);
        }
      );

      const logger = mockLogger();

      const bufferedUpdate = createBuffer(bulkUpdate, { logger });

      const task1 = createTask();
      const task2 = createTask();
      const task3 = createTask();

      await Promise.all([
        expect(bufferedUpdate(task1)).resolves.toMatchObject(incrementAttempts(task1)),
        expect(bufferedUpdate(task2)).rejects.toMatchObject(
          asErr(new Error(`Unhandled buffered operation for entity: ${task2.id}`))
        ),
        expect(bufferedUpdate(task3)).rejects.toMatchObject(
          asErr(new Error(`Unhandled buffered operation for entity: ${task3.id}`))
        ),
      ]);

      expect(logger.warn).toHaveBeenCalledTimes(2);
    });
  });
});
