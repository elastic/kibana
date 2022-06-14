/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import { none, some } from 'fp-ts/lib/Option';
import moment from 'moment';

import {
  asTaskRunEvent,
  asTaskClaimEvent,
  TaskClaimErrorType,
  TaskPersistence,
} from './task_events';
import { TaskLifecycleEvent } from './polling_lifecycle';
import { taskPollingLifecycleMock } from './polling_lifecycle.mock';
import { TaskScheduling } from './task_scheduling';
import { asErr, asOk } from './lib/result_type';
import { ConcreteTaskInstance, TaskLifecycleResult, TaskStatus } from './task';
import { createInitialMiddleware } from './lib/middleware';
import { taskStoreMock } from './task_store.mock';
import { TaskRunResult } from './task_running';
import { mockLogger } from './test_utils';
import { TaskTypeDictionary } from './task_type_dictionary';
import { ephemeralTaskLifecycleMock } from './ephemeral_task_lifecycle.mock';
import { mustBeAllOf } from './queries/query_clauses';

jest.mock('uuid', () => ({
  v4: () => 'v4uuid',
}));

jest.mock('elastic-apm-node', () => ({
  currentTraceparent: 'parent',
  currentTransaction: {
    type: 'taskManager run',
  },
}));

describe('TaskScheduling', () => {
  const mockTaskStore = taskStoreMock.create({});
  const mockTaskManager = taskPollingLifecycleMock.create({});
  const definitions = new TaskTypeDictionary(mockLogger());
  const taskSchedulingOpts = {
    taskStore: mockTaskStore,
    taskPollingLifecycle: mockTaskManager,
    logger: mockLogger(),
    middleware: createInitialMiddleware(),
    definitions,
    ephemeralTaskLifecycle: ephemeralTaskLifecycleMock.create({}),
    taskManagerId: '',
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

  describe('bulkUpdateSchedules', () => {
    const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';
    beforeEach(() => {
      mockTaskStore.bulkUpdate.mockImplementation(() =>
        Promise.resolve([{ tag: 'ok', value: mockTask() }])
      );
    });

    test('should search for tasks by ids and idle status', async () => {
      mockTaskStore.fetch.mockResolvedValue({ docs: [] });
      const taskScheduling = new TaskScheduling(taskSchedulingOpts);

      await taskScheduling.bulkUpdateSchedules([id], { interval: '1h' });

      expect(mockTaskStore.fetch).toHaveBeenCalledTimes(1);
      expect(mockTaskStore.fetch).toHaveBeenCalledWith({
        query: mustBeAllOf(
          {
            terms: {
              _id: [`task:${id}`],
            },
          },
          {
            term: {
              'task.status': 'idle',
            },
          }
        ),
        size: 100,
      });
    });

    test('should split search on chunks when input ids array too large', async () => {
      mockTaskStore.fetch.mockResolvedValue({ docs: [] });
      const taskScheduling = new TaskScheduling(taskSchedulingOpts);

      await taskScheduling.bulkUpdateSchedules(Array.from({ length: 1250 }), { interval: '1h' });

      expect(mockTaskStore.fetch).toHaveBeenCalledTimes(13);
    });

    test('should transform response into correct format', async () => {
      const successfulTask = mockTask({ id: 'task-1', schedule: { interval: '1h' } });
      const failedTask = mockTask({ id: 'task-2', schedule: { interval: '1h' } });
      mockTaskStore.bulkUpdate.mockImplementation(() =>
        Promise.resolve([
          { tag: 'ok', value: successfulTask },
          { tag: 'err', error: { entity: failedTask, error: new Error('fail') } },
        ])
      );
      mockTaskStore.fetch.mockResolvedValue({ docs: [successfulTask, failedTask] });

      const taskScheduling = new TaskScheduling(taskSchedulingOpts);
      const result = await taskScheduling.bulkUpdateSchedules([successfulTask.id, failedTask.id], {
        interval: '1h',
      });

      expect(result).toEqual({
        tasks: [successfulTask],
        errors: [{ task: failedTask, error: new Error('fail') }],
      });
    });

    test('should not update task if new interval is equal to previous', async () => {
      const task = mockTask({ id, schedule: { interval: '3h' } });

      mockTaskStore.fetch.mockResolvedValue({ docs: [task] });

      const taskScheduling = new TaskScheduling(taskSchedulingOpts);
      await taskScheduling.bulkUpdateSchedules([id], { interval: '3h' });

      const bulkUpdatePayload = mockTaskStore.bulkUpdate.mock.calls[0][0];

      expect(bulkUpdatePayload).toHaveLength(0);
    });

    test('should postpone task run if new interval is greater than previous', async () => {
      // task set to be run in 2 hrs from now
      const runInTwoHrs = new Date(Date.now() + moment.duration(2, 'hours').asMilliseconds());
      const task = mockTask({ id, schedule: { interval: '3h' }, runAt: runInTwoHrs });

      mockTaskStore.fetch.mockResolvedValue({ docs: [task] });

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
      const task = mockTask({ id, schedule: { interval: '3h' }, runAt: runInTwoHrs });

      mockTaskStore.fetch.mockResolvedValue({ docs: [task] });

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
      const task = mockTask({ id, schedule: { interval: '2h' }, runAt: runInOneHr });

      mockTaskStore.fetch.mockResolvedValue({ docs: [task] });

      const taskScheduling = new TaskScheduling(taskSchedulingOpts);
      await taskScheduling.bulkUpdateSchedules([id], { interval: '30m' });

      const bulkUpdatePayload = mockTaskStore.bulkUpdate.mock.calls[0][0];

      expect(bulkUpdatePayload[0]).toHaveProperty('schedule', { interval: '30m' });

      // if time that passed from last task run is greater than new interval, task should be set to run at now time
      expect(bulkUpdatePayload[0].runAt.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
  describe('runNow', () => {
    test('resolves when the task claim succeeds', () => {
      const events$ = new Subject<TaskLifecycleEvent>();
      const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';

      const taskScheduling = new TaskScheduling({
        ...taskSchedulingOpts,
        taskPollingLifecycle: taskPollingLifecycleMock.create({ events$ }),
      });

      const result = taskScheduling.runSoon(id);

      const task = mockTask({ id });
      events$.next(asTaskClaimEvent(id, asOk(task)));

      return expect(result).resolves.toEqual({ id });
    });

    test('rejects when the task run fails', () => {
      const events$ = new Subject<TaskLifecycleEvent>();
      const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';

      const taskScheduling = new TaskScheduling({
        ...taskSchedulingOpts,
        taskPollingLifecycle: taskPollingLifecycleMock.create({ events$ }),
      });

      const result = taskScheduling.runSoon(id);

      const task = mockTask({ id });
      events$.next(
        asTaskClaimEvent(
          id,
          asErr({
            task: some(task),
            errorType: TaskClaimErrorType.CLAIMED_BY_ID_NOT_IN_CLAIMING_STATUS,
          })
        )
      );

      return expect(result).rejects.toMatchInlineSnapshot(
        `[Error: Failed to run task "01ddff11-e88a-4d13-bc4e-256164e755e2" as it is currently running]`
      );
    });

    test('when a task claim fails we ensure the task exists', async () => {
      const events$ = new Subject<TaskLifecycleEvent>();
      const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';

      mockTaskStore.getLifecycle.mockResolvedValue(TaskLifecycleResult.NotFound);

      const taskScheduling = new TaskScheduling({
        ...taskSchedulingOpts,
        taskPollingLifecycle: taskPollingLifecycleMock.create({ events$ }),
      });

      const result = taskScheduling.runSoon(id);

      events$.next(
        asTaskClaimEvent(
          id,
          asErr({ task: none, errorType: TaskClaimErrorType.CLAIMED_BY_ID_NOT_RETURNED })
        )
      );

      await expect(result).rejects.toEqual(
        new Error(`Failed to run task "${id}" as it does not exist`)
      );

      expect(mockTaskStore.getLifecycle).toHaveBeenCalledWith(id);
    });

    test('when a task claim due to insufficient capacity we return an explicit message', async () => {
      const events$ = new Subject<TaskLifecycleEvent>();
      const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';

      mockTaskStore.getLifecycle.mockResolvedValue(TaskLifecycleResult.NotFound);

      const taskScheduling = new TaskScheduling({
        ...taskSchedulingOpts,
        taskPollingLifecycle: taskPollingLifecycleMock.create({ events$ }),
      });

      const result = taskScheduling.runSoon(id);

      const task = mockTask({ id, taskType: 'foo' });
      events$.next(
        asTaskClaimEvent(
          id,
          asErr({ task: some(task), errorType: TaskClaimErrorType.CLAIMED_BY_ID_OUT_OF_CAPACITY })
        )
      );

      await expect(result).rejects.toEqual(
        new Error(
          `Failed to claim task "${id}" as we would exceed the max concurrency of "${task.taskType}" which is 2. Rescheduled the task to ensure it is picked up as soon as possible.`
        )
      );
    });

    test('when a task claim fails we ensure the task isnt already claimed', async () => {
      const events$ = new Subject<TaskLifecycleEvent>();
      const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';

      mockTaskStore.getLifecycle.mockResolvedValue(TaskStatus.Claiming);

      const taskScheduling = new TaskScheduling({
        ...taskSchedulingOpts,
        taskPollingLifecycle: taskPollingLifecycleMock.create({ events$ }),
      });

      const result = taskScheduling.runSoon(id);

      events$.next(
        asTaskClaimEvent(
          id,
          asErr({ task: none, errorType: TaskClaimErrorType.CLAIMED_BY_ID_NOT_RETURNED })
        )
      );

      await expect(result).rejects.toEqual(
        new Error(`Failed to run task "${id}" as it is currently running`)
      );

      expect(mockTaskStore.getLifecycle).toHaveBeenCalledWith(id);
    });

    test('when a task claim fails we ensure the task isnt already running', async () => {
      const events$ = new Subject<TaskLifecycleEvent>();
      const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';

      mockTaskStore.getLifecycle.mockResolvedValue(TaskStatus.Running);

      const taskScheduling = new TaskScheduling({
        ...taskSchedulingOpts,
        taskPollingLifecycle: taskPollingLifecycleMock.create({ events$ }),
      });

      const result = taskScheduling.runSoon(id);

      events$.next(
        asTaskClaimEvent(
          id,
          asErr({ task: none, errorType: TaskClaimErrorType.CLAIMED_BY_ID_NOT_RETURNED })
        )
      );

      await expect(result).rejects.toEqual(
        new Error(`Failed to run task "${id}" as it is currently running`)
      );

      expect(mockTaskStore.getLifecycle).toHaveBeenCalledWith(id);
    });

    test('when a task claim fails we return the underlying error if the task is idle', async () => {
      const events$ = new Subject<TaskLifecycleEvent>();
      const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';

      mockTaskStore.getLifecycle.mockResolvedValue(TaskStatus.Idle);

      const taskScheduling = new TaskScheduling({
        ...taskSchedulingOpts,
        taskPollingLifecycle: taskPollingLifecycleMock.create({ events$ }),
      });

      const result = taskScheduling.runSoon(id);

      events$.next(
        asTaskClaimEvent(
          id,
          asErr({ task: none, errorType: TaskClaimErrorType.CLAIMED_BY_ID_NOT_RETURNED })
        )
      );

      await expect(result).rejects.toMatchInlineSnapshot(
        `[Error: Failed to run task "01ddff11-e88a-4d13-bc4e-256164e755e2" for unknown reason (Current Task Lifecycle is "idle")]`
      );

      expect(mockTaskStore.getLifecycle).toHaveBeenCalledWith(id);
    });

    test('when a task claim fails we return the underlying error if the task is failed', async () => {
      const events$ = new Subject<TaskLifecycleEvent>();
      const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';

      mockTaskStore.getLifecycle.mockResolvedValue(TaskStatus.Failed);

      const taskScheduling = new TaskScheduling({
        ...taskSchedulingOpts,
        taskPollingLifecycle: taskPollingLifecycleMock.create({ events$ }),
      });

      const result = taskScheduling.runSoon(id);

      events$.next(
        asTaskClaimEvent(
          id,
          asErr({ task: none, errorType: TaskClaimErrorType.CLAIMED_BY_ID_NOT_RETURNED })
        )
      );

      await expect(result).rejects.toMatchInlineSnapshot(
        `[Error: Failed to run task "01ddff11-e88a-4d13-bc4e-256164e755e2" for unknown reason (Current Task Lifecycle is "failed")]`
      );

      expect(mockTaskStore.getLifecycle).toHaveBeenCalledWith(id);
    });

    test('runs a task ephemerally', async () => {
      const ephemeralEvents$ = new Subject<TaskLifecycleEvent>();
      const ephemeralTask = mockTask({
        state: {
          foo: 'bar',
        },
      });
      const customEphemeralTaskLifecycleMock = ephemeralTaskLifecycleMock.create({
        events$: ephemeralEvents$,
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
          })
        )
      );

      expect(result).resolves.toEqual({ id: 'v4uuid', state: { foo: 'bar' } });
    });

    test('rejects ephemeral task if lifecycle returns an error', async () => {
      const ephemeralEvents$ = new Subject<TaskLifecycleEvent>();
      const ephemeralTask = mockTask({
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
          })
        )
      );

      expect(result).rejects.toMatchInlineSnapshot(
        `[Error: Ephemeral Task of type foo was rejected]`
      );
    });
  });
});

function mockTask(overrides: Partial<ConcreteTaskInstance> = {}): ConcreteTaskInstance {
  return {
    id: 'claimed-by-id',
    runAt: new Date(),
    taskType: 'foo',
    schedule: undefined,
    attempts: 0,
    status: TaskStatus.Claiming,
    params: { hello: 'world' },
    state: { baby: 'Henhen' },
    user: 'jimbo',
    scope: ['reporting'],
    ownerId: '',
    startedAt: null,
    retryAt: null,
    scheduledAt: new Date(),
    traceparent: 'taskTraceparent',
    ...overrides,
  };
}
