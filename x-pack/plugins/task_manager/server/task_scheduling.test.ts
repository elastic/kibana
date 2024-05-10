/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import moment from 'moment';

import { asTaskRunEvent, TaskPersistence } from './task_events';
import { TaskLifecycleEvent } from './polling_lifecycle';
import { TaskScheduling } from './task_scheduling';
import { asErr, asOk } from './lib/result_type';
import { TaskStatus } from './task';
import { createInitialMiddleware } from './lib/middleware';
import { taskStoreMock } from './task_store.mock';
import { TaskRunResult } from './task_running';
import { mockLogger } from './test_utils';
import { TaskTypeDictionary } from './task_type_dictionary';
import { ephemeralTaskLifecycleMock } from './ephemeral_task_lifecycle.mock';
import { taskManagerMock } from './mocks';
import { omit } from 'lodash';

let fakeTimer: sinon.SinonFakeTimers;
jest.mock('uuid', () => ({
  v4: () => 'v4uuid',
}));

jest.mock('./constants', () => ({
  CONCURRENCY_ALLOW_LIST_BY_TASK_TYPE: ['foo'],
}));

jest.mock('elastic-apm-node', () => ({
  currentTraceparent: 'parent',
  currentTransaction: {
    type: 'taskManager run',
  },
}));

describe('TaskScheduling', () => {
  beforeAll(() => {
    fakeTimer = sinon.useFakeTimers();
  });
  afterAll(() => fakeTimer.restore());

  const mockTaskStore = taskStoreMock.create({});
  const definitions = new TaskTypeDictionary(mockLogger());
  const taskSchedulingOpts = {
    taskStore: mockTaskStore,
    logger: mockLogger(),
    middleware: createInitialMiddleware(),
    definitions,
    ephemeralTaskLifecycle: ephemeralTaskLifecycleMock.create({}),
    taskManagerId: '123',
  };

  definitions.registerTaskDefinitions({
    foo: {
      title: 'foo',
      maxConcurrency: 2,
      createTaskRunner: jest.fn(),
    },
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('allows scheduling tasks', async () => {
    const taskScheduling = new TaskScheduling(taskSchedulingOpts);
    const task = {
      taskType: 'foo',
      params: {},
      state: {},
    };
    await taskScheduling.schedule(task);
    expect(mockTaskStore.schedule).toHaveBeenCalled();
    expect(mockTaskStore.schedule).toHaveBeenCalledWith({
      ...task,
      id: undefined,
      schedule: undefined,
      traceparent: 'parent',
      enabled: true,
    });
  });

  test('allows scheduling tasks that are disabled', async () => {
    const taskScheduling = new TaskScheduling(taskSchedulingOpts);
    const task = {
      taskType: 'foo',
      enabled: false,
      params: {},
      state: {},
    };
    await taskScheduling.schedule(task);
    expect(mockTaskStore.schedule).toHaveBeenCalled();
    expect(mockTaskStore.schedule).toHaveBeenCalledWith({
      ...task,
      id: undefined,
      schedule: undefined,
      traceparent: 'parent',
      enabled: false,
    });
  });

  test('allows scheduling existing tasks that may have already been scheduled', async () => {
    const taskScheduling = new TaskScheduling(taskSchedulingOpts);
    mockTaskStore.schedule.mockRejectedValueOnce({
      statusCode: 409,
    });

    const result = await taskScheduling.ensureScheduled({
      id: 'my-foo-id',
      taskType: 'foo',
      params: {},
      state: {},
    });

    expect(result.id).toEqual('my-foo-id');
  });

  test('doesnt ignore failure to scheduling existing tasks for reasons other than already being scheduled', async () => {
    const taskScheduling = new TaskScheduling(taskSchedulingOpts);
    mockTaskStore.schedule.mockRejectedValueOnce({
      statusCode: 500,
    });

    return expect(
      taskScheduling.ensureScheduled({
        id: 'my-foo-id',
        taskType: 'foo',
        params: {},
        state: {},
      })
    ).rejects.toMatchObject({
      statusCode: 500,
    });
  });

  test('doesnt allow naively rescheduling existing tasks that have already been scheduled', async () => {
    const taskScheduling = new TaskScheduling(taskSchedulingOpts);
    mockTaskStore.schedule.mockRejectedValueOnce({
      statusCode: 409,
    });

    return expect(
      taskScheduling.schedule({
        id: 'my-foo-id',
        taskType: 'foo',
        params: {},
        state: {},
      })
    ).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  describe('bulkEnable', () => {
    const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';
    beforeEach(() => {
      mockTaskStore.bulkUpdate.mockImplementation(() =>
        Promise.resolve([{ tag: 'ok', value: taskManagerMock.createTask() }])
      );
    });

    test('should split search on chunks when input ids array too large', async () => {
      mockTaskStore.bulkGet.mockResolvedValue([]);
      const taskScheduling = new TaskScheduling(taskSchedulingOpts);

      await taskScheduling.bulkEnable(Array.from({ length: 1250 }), false);

      expect(mockTaskStore.bulkGet).toHaveBeenCalledTimes(13);
    });

    test('should transform response into correct format', async () => {
      const successfulTask = taskManagerMock.createTask({
        id: 'task-1',
        enabled: false,
        schedule: { interval: '1h' },
      });
      const failedToUpdateTask = taskManagerMock.createTask({
        id: 'task-2',
        enabled: false,
        schedule: { interval: '1h' },
      });
      mockTaskStore.bulkUpdate.mockImplementation(() =>
        Promise.resolve([
          { tag: 'ok', value: successfulTask },
          {
            tag: 'err',
            error: {
              type: 'task',
              id: failedToUpdateTask.id,
              error: {
                statusCode: 400,
                error: 'fail',
                message: 'fail',
              },
            },
          },
        ])
      );
      mockTaskStore.bulkGet.mockResolvedValue([asOk(successfulTask), asOk(failedToUpdateTask)]);

      const taskScheduling = new TaskScheduling(taskSchedulingOpts);
      const result = await taskScheduling.bulkEnable([successfulTask.id, failedToUpdateTask.id]);

      expect(result).toEqual({
        tasks: [successfulTask],
        errors: [
          {
            type: 'task',
            id: failedToUpdateTask.id,
            error: {
              statusCode: 400,
              error: 'fail',
              message: 'fail',
            },
          },
        ],
      });
    });

    test('should not enable task if it is already enabled', async () => {
      const task = taskManagerMock.createTask({ id, enabled: true, schedule: { interval: '3h' } });

      mockTaskStore.bulkGet.mockResolvedValue([asOk(task)]);

      const taskScheduling = new TaskScheduling(taskSchedulingOpts);
      await taskScheduling.bulkEnable([id]);

      const bulkUpdatePayload = mockTaskStore.bulkUpdate.mock.calls[0][0];

      expect(bulkUpdatePayload).toHaveLength(0);
    });

    test('should set runAt and scheduledAt if runSoon is true', async () => {
      const task = taskManagerMock.createTask({
        id,
        enabled: false,
        schedule: { interval: '3h' },
        runAt: new Date('1969-09-13T21:33:58.285Z'),
        scheduledAt: new Date('1969-09-10T21:33:58.285Z'),
      });
      mockTaskStore.bulkUpdate.mockImplementation(() =>
        Promise.resolve([{ tag: 'ok', value: task }])
      );
      mockTaskStore.bulkGet.mockResolvedValue([asOk(task)]);

      const taskScheduling = new TaskScheduling(taskSchedulingOpts);
      await taskScheduling.bulkEnable([id]);

      const bulkUpdatePayload = mockTaskStore.bulkUpdate.mock.calls[0][0];

      expect(bulkUpdatePayload).toEqual([
        {
          ...task,
          enabled: true,
          runAt: new Date('1970-01-01T00:00:00.000Z'),
          scheduledAt: new Date('1970-01-01T00:00:00.000Z'),
        },
      ]);
    });

    test('should not set runAt and scheduledAt if runSoon is false', async () => {
      const task = taskManagerMock.createTask({
        id,
        enabled: false,
        schedule: { interval: '3h' },
        runAt: new Date('1969-09-13T21:33:58.285Z'),
        scheduledAt: new Date('1969-09-10T21:33:58.285Z'),
      });
      mockTaskStore.bulkUpdate.mockImplementation(() =>
        Promise.resolve([{ tag: 'ok', value: task }])
      );
      mockTaskStore.bulkGet.mockResolvedValue([asOk(task)]);

      const taskScheduling = new TaskScheduling(taskSchedulingOpts);
      await taskScheduling.bulkEnable([id], false);

      const bulkUpdatePayload = mockTaskStore.bulkUpdate.mock.calls[0][0];

      expect(bulkUpdatePayload).toEqual([
        {
          ...task,
          enabled: true,
        },
      ]);
    });

    test('should offset runAt and scheduledAt by no more than 5m if more than one task is enabled', async () => {
      const task = taskManagerMock.createTask({
        id: 'task-1',
        enabled: false,
        schedule: { interval: '3h' },
        runAt: new Date('1969-09-13T21:33:58.285Z'),
        scheduledAt: new Date('1969-09-10T21:33:58.285Z'),
      });
      const task2 = taskManagerMock.createTask({
        id: 'task-2',
        enabled: false,
        schedule: { interval: '3h' },
        runAt: new Date('1969-09-13T21:33:58.285Z'),
        scheduledAt: new Date('1969-09-10T21:33:58.285Z'),
      });
      mockTaskStore.bulkUpdate.mockImplementation(() =>
        Promise.resolve([{ tag: 'ok', value: task }])
      );
      mockTaskStore.bulkGet.mockResolvedValue([asOk(task), asOk(task2)]);

      const taskScheduling = new TaskScheduling(taskSchedulingOpts);
      await taskScheduling.bulkEnable([task.id, task2.id]);

      const bulkUpdatePayload = mockTaskStore.bulkUpdate.mock.calls[0][0];

      expect(bulkUpdatePayload.length).toBe(2);
      expect(bulkUpdatePayload[0]).toEqual({
        ...task,
        enabled: true,
        runAt: new Date('1970-01-01T00:00:00.000Z'),
        scheduledAt: new Date('1970-01-01T00:00:00.000Z'),
      });

      expect(omit(bulkUpdatePayload[1], 'runAt', 'scheduledAt')).toEqual({
        ...omit(task2, 'runAt', 'scheduledAt'),
        enabled: true,
      });

      const { runAt, scheduledAt } = bulkUpdatePayload[1];
      expect(runAt.getTime()).toEqual(scheduledAt.getTime());
      expect(runAt.getTime() - bulkUpdatePayload[0].runAt.getTime()).toBeLessThanOrEqual(
        5 * 60 * 1000
      );
    });
  });

  describe('bulkDisable', () => {
    const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';
    beforeEach(() => {
      mockTaskStore.bulkUpdate.mockImplementation(() =>
        Promise.resolve([{ tag: 'ok', value: taskManagerMock.createTask() }])
      );
    });

    test('should split search on chunks when input ids array too large', async () => {
      mockTaskStore.bulkGet.mockResolvedValue([]);
      const taskScheduling = new TaskScheduling(taskSchedulingOpts);

      await taskScheduling.bulkDisable(Array.from({ length: 1250 }));

      expect(mockTaskStore.bulkGet).toHaveBeenCalledTimes(13);
    });

    test('should transform response into correct format', async () => {
      const successfulTask = taskManagerMock.createTask({
        id: 'task-1',
        enabled: false,
        schedule: { interval: '1h' },
      });
      const failedToUpdateTask = taskManagerMock.createTask({
        id: 'task-2',
        enabled: true,
        schedule: { interval: '1h' },
      });
      mockTaskStore.bulkUpdate.mockImplementation(() =>
        Promise.resolve([
          { tag: 'ok', value: successfulTask },
          {
            tag: 'err',
            error: {
              type: 'task',
              id: failedToUpdateTask.id,
              error: {
                statusCode: 400,
                error: 'fail',
                message: 'fail',
              },
            },
          },
        ])
      );
      mockTaskStore.bulkGet.mockResolvedValue([asOk(successfulTask), asOk(failedToUpdateTask)]);

      const taskScheduling = new TaskScheduling(taskSchedulingOpts);
      const result = await taskScheduling.bulkDisable([successfulTask.id, failedToUpdateTask.id]);

      expect(result).toEqual({
        tasks: [successfulTask],
        errors: [
          {
            type: 'task',
            id: failedToUpdateTask.id,
            error: {
              statusCode: 400,
              error: 'fail',
              message: 'fail',
            },
          },
        ],
      });
    });

    test('should not disable task if it is already disabled', async () => {
      const task = taskManagerMock.createTask({ id, enabled: false, schedule: { interval: '3h' } });

      mockTaskStore.bulkGet.mockResolvedValue([asOk(task)]);

      const taskScheduling = new TaskScheduling(taskSchedulingOpts);
      await taskScheduling.bulkDisable([id]);

      const bulkUpdatePayload = mockTaskStore.bulkUpdate.mock.calls[0][0];

      expect(bulkUpdatePayload).toHaveLength(0);
    });
  });

  describe('bulkUpdateState', () => {
    const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';
    beforeEach(() => {
      mockTaskStore.bulkUpdate.mockImplementation(() =>
        Promise.resolve([{ tag: 'ok', value: taskManagerMock.createTask() }])
      );
    });

    test('should split search on chunks when input ids array too large', async () => {
      mockTaskStore.bulkGet.mockResolvedValue([]);
      const taskScheduling = new TaskScheduling(taskSchedulingOpts);

      await taskScheduling.bulkUpdateState(Array.from({ length: 1250 }), jest.fn());

      expect(mockTaskStore.bulkGet).toHaveBeenCalledTimes(13);
    });

    test('should transform response into correct format', async () => {
      const successfulTask = taskManagerMock.createTask({
        id: 'task-1',
        enabled: false,
        schedule: { interval: '1h' },
        state: {
          'hello i am a state that has been modified': "not really but we're going to pretend",
        },
      });
      const failedToUpdateTask = taskManagerMock.createTask({
        id: 'task-2',
        enabled: true,
        schedule: { interval: '1h' },
        state: { 'this state is unchangeable': 'none shall update me' },
      });
      mockTaskStore.bulkUpdate.mockImplementation(() =>
        Promise.resolve([
          { tag: 'ok', value: successfulTask },
          {
            tag: 'err',
            error: {
              type: 'task',
              id: failedToUpdateTask.id,
              error: {
                statusCode: 400,
                error: 'fail',
                message: 'fail',
              },
            },
          },
        ])
      );
      mockTaskStore.bulkGet.mockResolvedValue([asOk(successfulTask), asOk(failedToUpdateTask)]);

      const taskScheduling = new TaskScheduling(taskSchedulingOpts);
      const result = await taskScheduling.bulkUpdateState(
        [successfulTask.id, failedToUpdateTask.id],
        jest.fn()
      );

      expect(result).toEqual({
        tasks: [successfulTask],
        errors: [
          {
            type: 'task',
            id: failedToUpdateTask.id,
            error: {
              statusCode: 400,
              error: 'fail',
              message: 'fail',
            },
          },
        ],
      });
    });

    test('should execute updater function on tasks', async () => {
      const task = taskManagerMock.createTask({
        id,
        enabled: false,
        schedule: { interval: '3h' },
        runAt: new Date('1969-09-13T21:33:58.285Z'),
        scheduledAt: new Date('1969-09-10T21:33:58.285Z'),
        state: { removeMe: 'please remove me i dont like being in this task manager state' },
      });
      const updaterFn = jest.fn((state) => {
        return {
          ...omit(state, 'removeMe'),
          expectedValue: 'HELLO I AM AN EXPECTED VALUE IT IS VERY NICE TO MEET YOU',
        };
      });
      mockTaskStore.bulkUpdate.mockImplementation(() =>
        Promise.resolve([{ tag: 'ok', value: task }])
      );
      mockTaskStore.bulkGet.mockResolvedValue([asOk(task)]);

      const taskScheduling = new TaskScheduling(taskSchedulingOpts);
      await taskScheduling.bulkUpdateState([id], updaterFn);

      const bulkUpdatePayload = mockTaskStore.bulkUpdate.mock.calls[0][0];

      expect(bulkUpdatePayload).toMatchInlineSnapshot(`
        Array [
          Object {
            "attempts": 0,
            "enabled": false,
            "id": "01ddff11-e88a-4d13-bc4e-256164e755e2",
            "ownerId": "123",
            "params": Object {
              "hello": "world",
            },
            "retryAt": null,
            "runAt": 1969-09-13T21:33:58.285Z,
            "schedule": Object {
              "interval": "3h",
            },
            "scheduledAt": 1969-09-10T21:33:58.285Z,
            "scope": undefined,
            "startedAt": null,
            "state": Object {
              "expectedValue": "HELLO I AM AN EXPECTED VALUE IT IS VERY NICE TO MEET YOU",
            },
            "status": "idle",
            "taskType": "foo",
            "user": undefined,
            "version": "123",
          },
        ]
      `);
    });
  });

  describe('bulkUpdateSchedules', () => {
    const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';
    beforeEach(() => {
      mockTaskStore.bulkUpdate.mockImplementation(() =>
        Promise.resolve([{ tag: 'ok', value: taskManagerMock.createTask() }])
      );
    });

    test('should split search on chunks when input ids array too large', async () => {
      mockTaskStore.bulkGet.mockResolvedValue([]);
      const taskScheduling = new TaskScheduling(taskSchedulingOpts);

      await taskScheduling.bulkUpdateSchedules(Array.from({ length: 1250 }), { interval: '1h' });

      expect(mockTaskStore.bulkGet).toHaveBeenCalledTimes(13);
    });

    test('should transform response into correct format', async () => {
      const successfulTask = taskManagerMock.createTask({
        id: 'task-1',
        schedule: { interval: '1h' },
      });
      const failedToUpdateTask = taskManagerMock.createTask({
        id: 'task-2',
        schedule: { interval: '1h' },
      });
      mockTaskStore.bulkUpdate.mockImplementation(() =>
        Promise.resolve([
          { tag: 'ok', value: successfulTask },
          {
            tag: 'err',
            error: {
              type: 'task',
              id: failedToUpdateTask.id,
              error: {
                statusCode: 400,
                error: 'fail',
                message: 'fail',
              },
            },
          },
        ])
      );
      mockTaskStore.bulkGet.mockResolvedValue([asOk(successfulTask), asOk(failedToUpdateTask)]);

      const taskScheduling = new TaskScheduling(taskSchedulingOpts);
      const result = await taskScheduling.bulkUpdateSchedules(
        [successfulTask.id, failedToUpdateTask.id],
        { interval: '1h' }
      );

      expect(result).toEqual({
        tasks: [successfulTask],
        errors: [
          {
            type: 'task',
            id: failedToUpdateTask.id,
            error: {
              statusCode: 400,
              error: 'fail',
              message: 'fail',
            },
          },
        ],
      });
    });

    test('should not update task if new interval is equal to previous', async () => {
      const task = taskManagerMock.createTask({ id, schedule: { interval: '3h' } });

      mockTaskStore.bulkGet.mockResolvedValue([asOk(task)]);

      const taskScheduling = new TaskScheduling(taskSchedulingOpts);
      await taskScheduling.bulkUpdateSchedules([id], { interval: '3h' });

      const bulkUpdatePayload = mockTaskStore.bulkUpdate.mock.calls[0][0];

      expect(bulkUpdatePayload).toHaveLength(0);
    });

    test('should postpone task run if new interval is greater than previous', async () => {
      // task set to be run in 2 hrs from now
      const runInTwoHrs = new Date(Date.now() + moment.duration(2, 'hours').asMilliseconds());
      const task = taskManagerMock.createTask({
        id,
        schedule: { interval: '3h' },
        runAt: runInTwoHrs,
      });

      mockTaskStore.bulkGet.mockResolvedValue([asOk(task)]);

      const taskScheduling = new TaskScheduling(taskSchedulingOpts);
      await taskScheduling.bulkUpdateSchedules([id], { interval: '5h' });

      const bulkUpdatePayload = mockTaskStore.bulkUpdate.mock.calls[0][0];

      expect(bulkUpdatePayload).toHaveLength(1);
      expect(bulkUpdatePayload[0]).toHaveProperty('schedule', { interval: '5h' });
      // if tasks updated with schedule interval of '5h' and previous interval was 3h, task will be scheduled to run in 2 hours later
      expect(bulkUpdatePayload[0].runAt.getTime() - runInTwoHrs.getTime()).toBe(
        moment.duration(2, 'hours').asMilliseconds()
      );
    });

    test('should set task run sooner if new interval is lesser than previous', async () => {
      // task set to be run in one 2hrs from now
      const runInTwoHrs = new Date(Date.now() + moment.duration(2, 'hours').asMilliseconds());
      const task = taskManagerMock.createTask({
        id,
        schedule: { interval: '3h' },
        runAt: runInTwoHrs,
      });

      mockTaskStore.bulkGet.mockResolvedValue([asOk(task)]);

      const taskScheduling = new TaskScheduling(taskSchedulingOpts);
      await taskScheduling.bulkUpdateSchedules([id], { interval: '2h' });

      const bulkUpdatePayload = mockTaskStore.bulkUpdate.mock.calls[0][0];

      expect(bulkUpdatePayload[0]).toHaveProperty('schedule', { interval: '2h' });
      // if tasks updated with schedule interval of '2h' and previous interval was 3h, task will be scheduled to run in 1 hour sooner
      expect(runInTwoHrs.getTime() - bulkUpdatePayload[0].runAt.getTime()).toBe(
        moment.duration(1, 'hour').asMilliseconds()
      );
    });

    test('should set task run to now if time that passed from last run is greater than new interval', async () => {
      // task set to be run in one 1hr from now. With interval of '2h', it means last run happened 1 hour ago
      const runInOneHr = new Date(Date.now() + moment.duration(1, 'hour').asMilliseconds());
      const task = taskManagerMock.createTask({
        id,
        schedule: { interval: '2h' },
        runAt: runInOneHr,
      });

      mockTaskStore.bulkGet.mockResolvedValue([asOk(task)]);

      const taskScheduling = new TaskScheduling(taskSchedulingOpts);
      await taskScheduling.bulkUpdateSchedules([id], { interval: '30m' });

      const bulkUpdatePayload = mockTaskStore.bulkUpdate.mock.calls[0][0];

      expect(bulkUpdatePayload[0]).toHaveProperty('schedule', { interval: '30m' });

      // if time that passed from last task run is greater than new interval, task should be set to run at now time
      expect(bulkUpdatePayload[0].runAt.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('runSoon', () => {
    test('resolves when the task update succeeds', async () => {
      const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';
      const taskScheduling = new TaskScheduling(taskSchedulingOpts);

      mockTaskStore.get.mockResolvedValueOnce(
        taskManagerMock.createTask({ id, status: TaskStatus.Idle })
      );
      mockTaskStore.update.mockResolvedValueOnce(taskManagerMock.createTask({ id }));

      const result = await taskScheduling.runSoon(id);

      expect(mockTaskStore.update).toHaveBeenCalledWith(
        taskManagerMock.createTask({
          id,
          status: TaskStatus.Idle,
          runAt: expect.any(Date),
          scheduledAt: expect.any(Date),
        }),
        { validate: false }
      );
      expect(mockTaskStore.get).toHaveBeenCalledWith(id);
      expect(result).toEqual({ id });
    });

    test('runs failed tasks too', async () => {
      const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';
      const taskScheduling = new TaskScheduling(taskSchedulingOpts);

      mockTaskStore.get.mockResolvedValueOnce(
        taskManagerMock.createTask({ id, status: TaskStatus.Failed })
      );
      mockTaskStore.update.mockResolvedValueOnce(taskManagerMock.createTask({ id }));

      const result = await taskScheduling.runSoon(id);
      expect(mockTaskStore.update).toHaveBeenCalledWith(
        taskManagerMock.createTask({
          id,
          status: TaskStatus.Idle,
          runAt: expect.any(Date),
          scheduledAt: expect.any(Date),
        }),
        { validate: false }
      );
      expect(mockTaskStore.get).toHaveBeenCalledWith(id);
      expect(result).toEqual({ id });
    });

    test('rejects when the task update fails', async () => {
      const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';
      const taskScheduling = new TaskScheduling(taskSchedulingOpts);

      mockTaskStore.get.mockResolvedValueOnce(
        taskManagerMock.createTask({ id, status: TaskStatus.Idle })
      );
      mockTaskStore.update.mockRejectedValueOnce(500);

      const result = taskScheduling.runSoon(id);
      await expect(result).rejects.toEqual(500);
      expect(taskSchedulingOpts.logger.error).toHaveBeenCalledWith(
        'Failed to update the task (01ddff11-e88a-4d13-bc4e-256164e755e2) for runSoon'
      );
    });

    test('ignores 409 conflict errors', async () => {
      const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';
      const taskScheduling = new TaskScheduling(taskSchedulingOpts);

      mockTaskStore.get.mockResolvedValueOnce(
        taskManagerMock.createTask({ id, status: TaskStatus.Idle })
      );
      mockTaskStore.update.mockRejectedValueOnce({ statusCode: 409 });

      const result = await taskScheduling.runSoon(id);
      expect(result).toEqual({ id });
      expect(taskSchedulingOpts.logger.debug).toHaveBeenCalledWith(
        'Failed to update the task (01ddff11-e88a-4d13-bc4e-256164e755e2) for runSoon due to conflict (409)'
      );
    });

    test('rejects when the task is being claimed', async () => {
      const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';
      const taskScheduling = new TaskScheduling(taskSchedulingOpts);

      mockTaskStore.get.mockResolvedValueOnce(
        taskManagerMock.createTask({ id, status: TaskStatus.Claiming })
      );
      mockTaskStore.update.mockRejectedValueOnce(409);

      const result = taskScheduling.runSoon(id);
      await expect(result).rejects.toEqual(
        Error(
          'Failed to run task "01ddff11-e88a-4d13-bc4e-256164e755e2" as it is currently running'
        )
      );
    });

    test('rejects when the task is already running', async () => {
      const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';
      const taskScheduling = new TaskScheduling(taskSchedulingOpts);

      mockTaskStore.get.mockResolvedValueOnce(
        taskManagerMock.createTask({ id, status: TaskStatus.Running })
      );
      mockTaskStore.update.mockRejectedValueOnce(409);

      const result = taskScheduling.runSoon(id);
      await expect(result).rejects.toEqual(
        Error(
          'Failed to run task "01ddff11-e88a-4d13-bc4e-256164e755e2" as it is currently running'
        )
      );
    });

    test('rejects when the task status is Unrecognized', async () => {
      const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';
      const taskScheduling = new TaskScheduling(taskSchedulingOpts);

      mockTaskStore.get.mockResolvedValueOnce(
        taskManagerMock.createTask({ id, status: TaskStatus.Unrecognized })
      );
      mockTaskStore.update.mockRejectedValueOnce(409);

      const result = taskScheduling.runSoon(id);
      await expect(result).rejects.toEqual(
        Error('Failed to run task "01ddff11-e88a-4d13-bc4e-256164e755e2" with status unrecognized')
      );
    });

    test('rejects when the task does not exist', async () => {
      const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';
      const taskScheduling = new TaskScheduling(taskSchedulingOpts);

      mockTaskStore.get.mockRejectedValueOnce(404);

      const result = taskScheduling.runSoon(id);
      await expect(result).rejects.toEqual(404);
    });
  });

  describe('ephemeralRunNow', () => {
    test('runs a task ephemerally', async () => {
      const ephemeralEvents$ = new BehaviorSubject<Partial<TaskLifecycleEvent>>({});
      const ephemeralTask = taskManagerMock.createTask({
        state: {
          foo: 'bar',
        },
      });
      const customEphemeralTaskLifecycleMock = ephemeralTaskLifecycleMock.create({
        events$: ephemeralEvents$ as Observable<TaskLifecycleEvent>,
      });

      customEphemeralTaskLifecycleMock.attemptToRun.mockImplementation((value) => {
        return {
          tag: 'ok',
          value,
        };
      });

      const middleware = createInitialMiddleware();
      middleware.beforeSave = jest.fn().mockImplementation(async () => {
        return { taskInstance: ephemeralTask };
      });
      const taskScheduling = new TaskScheduling({
        ...taskSchedulingOpts,
        middleware,
        ephemeralTaskLifecycle: customEphemeralTaskLifecycleMock,
      });

      const result = taskScheduling.ephemeralRunNow(ephemeralTask);
      ephemeralEvents$.next(
        asTaskRunEvent(
          'v4uuid',
          asOk({
            task: {
              ...ephemeralTask,
              id: 'v4uuid',
            },
            result: TaskRunResult.Success,
            persistence: TaskPersistence.Ephemeral,
            isExpired: false,
          })
        )
      );
      await expect(result).resolves.toEqual({ id: 'v4uuid', state: { foo: 'bar' } });
    });

    test('rejects ephemeral task if lifecycle returns an error', async () => {
      const ephemeralEvents$ = new Subject<TaskLifecycleEvent>();
      const ephemeralTask = taskManagerMock.createTask({
        state: {
          foo: 'bar',
        },
      });
      const customEphemeralTaskLifecycleMock = ephemeralTaskLifecycleMock.create({
        events$: ephemeralEvents$,
      });

      customEphemeralTaskLifecycleMock.attemptToRun.mockImplementation((value) => {
        return asErr(value);
      });

      const middleware = createInitialMiddleware();
      middleware.beforeSave = jest.fn().mockImplementation(async () => {
        return { taskInstance: ephemeralTask };
      });
      const taskScheduling = new TaskScheduling({
        ...taskSchedulingOpts,
        middleware,
        ephemeralTaskLifecycle: customEphemeralTaskLifecycleMock,
      });

      const result = taskScheduling.ephemeralRunNow(ephemeralTask);
      ephemeralEvents$.next(
        asTaskRunEvent(
          'v4uuid',
          asOk({
            task: {
              ...ephemeralTask,
              id: 'v4uuid',
            },
            result: TaskRunResult.Failed,
            persistence: TaskPersistence.Ephemeral,
            isExpired: false,
          })
        )
      );

      await expect(result).rejects.toMatchInlineSnapshot(
        `[Error: Ephemeral Task of type foo was rejected]`
      );
    });

    test('rejects ephemeral task if ephemeralTaskLifecycle is not defined', async () => {
      const ephemeralTask = taskManagerMock.createTask({
        state: {
          foo: 'bar',
        },
      });
      const middleware = createInitialMiddleware();
      middleware.beforeSave = jest.fn().mockImplementation(async () => {
        return { taskInstance: ephemeralTask };
      });
      const taskScheduling = new TaskScheduling({
        ...taskSchedulingOpts,
        middleware,
        ephemeralTaskLifecycle: undefined,
      });

      const result = taskScheduling.ephemeralRunNow(ephemeralTask);
      await expect(result).rejects.toMatchInlineSnapshot(
        `[Error: Ephemeral Task of type foo was rejected because ephemeral tasks are not supported]`
      );
    });
  });

  describe('bulkSchedule', () => {
    test('allows scheduling tasks', async () => {
      const taskScheduling = new TaskScheduling(taskSchedulingOpts);
      const task = {
        taskType: 'foo',
        params: {},
        state: {},
      };
      await taskScheduling.bulkSchedule([task]);
      expect(mockTaskStore.bulkSchedule).toHaveBeenCalled();
      expect(mockTaskStore.bulkSchedule).toHaveBeenCalledWith([
        {
          ...task,
          id: undefined,
          schedule: undefined,
          traceparent: 'parent',
          enabled: true,
        },
      ]);
    });

    test('allows scheduling tasks that are disabled', async () => {
      const taskScheduling = new TaskScheduling(taskSchedulingOpts);
      const task1 = {
        taskType: 'foo',
        params: {},
        state: {},
      };
      const task2 = {
        taskType: 'foo',
        params: {},
        state: {},
        enabled: false,
      };
      await taskScheduling.bulkSchedule([task1, task2]);
      expect(mockTaskStore.bulkSchedule).toHaveBeenCalled();
      expect(mockTaskStore.bulkSchedule).toHaveBeenCalledWith([
        {
          ...task1,
          id: undefined,
          schedule: undefined,
          traceparent: 'parent',
          enabled: true,
        },
        {
          ...task2,
          id: undefined,
          schedule: undefined,
          traceparent: 'parent',
          enabled: false,
        },
      ]);
    });

    test('doesnt allow naively rescheduling existing tasks that have already been scheduled', async () => {
      const taskScheduling = new TaskScheduling(taskSchedulingOpts);
      mockTaskStore.bulkSchedule.mockRejectedValueOnce({
        statusCode: 409,
      });

      return expect(
        taskScheduling.bulkSchedule([
          {
            id: 'my-foo-id',
            taskType: 'foo',
            params: {},
            state: {},
          },
        ])
      ).rejects.toMatchObject({
        statusCode: 409,
      });
    });
  });
});
