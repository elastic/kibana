/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { asErr, asOk } from './result_type';
import { retryableBulkUpdate } from './retryable_bulk_update';
import { taskStoreMock } from '../task_store.mock';
import { TaskStatus, ConcreteTaskInstance } from '../task';

describe('retryableBulkUpdate()', () => {
  const taskIds = ['1', '2', '3'];
  const tasks = [mockTask({ id: '1' }), mockTask({ id: '2' }), mockTask({ id: '3' })];
  const getTasks = jest.fn();
  const filter = jest.fn();
  const map = jest.fn();
  const store = taskStoreMock.create();

  beforeEach(() => {
    jest.resetAllMocks();
    getTasks.mockResolvedValue(tasks.map((task) => asOk(task)));
    filter.mockImplementation(() => true);
    map.mockImplementation((task) => task);
    store.bulkUpdate.mockResolvedValue(tasks.map((task) => asOk(task)));
  });

  it('should call getTasks with taskIds', async () => {
    await retryableBulkUpdate({ taskIds, getTasks, filter, map, store });
    expect(getTasks).toHaveBeenCalledWith(taskIds);
  });

  it('should filter tasks returned from getTasks', async () => {
    filter.mockImplementation((task) => task.id === '2');
    await retryableBulkUpdate({ taskIds, getTasks, filter, map, store });
    expect(filter).toHaveBeenCalledTimes(3);
    // Map happens after filter
    expect(map).toHaveBeenCalledTimes(1);
    expect(store.bulkUpdate).toHaveBeenCalledWith([tasks[1]]);
  });

  it('should map tasks returned from getTasks', async () => {
    map.mockImplementation((task) => ({ ...task, status: TaskStatus.Claiming }));
    await retryableBulkUpdate({ taskIds, getTasks, filter, map, store });
    expect(map).toHaveBeenCalledTimes(3);
    expect(store.bulkUpdate).toHaveBeenCalledWith(
      tasks.map((task) => ({ ...task, status: TaskStatus.Claiming }))
    );
  });

  it('should retry tasks that have a status code of 409', async () => {
    getTasks.mockResolvedValueOnce(tasks.map((task) => asOk(task)));
    store.bulkUpdate.mockResolvedValueOnce([
      asErr({
        entity: tasks[0],
        error: {
          type: 'task',
          id: tasks[0].id,
          error: {
            statusCode: 409,
            error: 'Conflict',
            message: 'Conflict',
          },
        },
      }),
      asOk(tasks[1]),
      asOk(tasks[2]),
    ]);
    getTasks.mockResolvedValueOnce([tasks[0]].map((task) => asOk(task)));
    store.bulkUpdate.mockResolvedValueOnce(tasks.map((task) => asOk(task)));
    await retryableBulkUpdate({ taskIds, getTasks, filter, map, store });
    expect(store.bulkUpdate).toHaveBeenCalledTimes(2);
    expect(store.bulkUpdate).toHaveBeenNthCalledWith(2, [tasks[0]]);
  });

  it('should skip updating tasks that cannot be found', async () => {
    getTasks.mockResolvedValue([
      asOk(tasks[0]),
      asErr({
        id: tasks[1].id,
        type: 'task',
        error: { error: 'Oh no', message: 'Oh no', statusCode: 404 },
      }),
      asOk(tasks[2]),
    ]);
    await retryableBulkUpdate({ taskIds, getTasks, filter, map, store });
    expect(store.bulkUpdate).toHaveBeenCalledWith([tasks[0], tasks[2]]);
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
