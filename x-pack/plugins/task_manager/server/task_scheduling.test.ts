/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { Subject } from 'rxjs';
import { none, some } from 'fp-ts/lib/Option';

import {
  asTaskMarkRunningEvent,
  asTaskRunEvent,
  asTaskClaimEvent,
  asTaskRunRequestEvent,
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

  describe('runNow', () => {
    test('resolves when the task run succeeds', () => {
      const events$ = new Subject<TaskLifecycleEvent>();
      const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';

      const taskScheduling = new TaskScheduling({
        ...taskSchedulingOpts,
        taskPollingLifecycle: taskPollingLifecycleMock.create({ events$ }),
      });

      const result = taskScheduling.runNow(id);

      const task = mockTask({ id });
      events$.next(
        asTaskRunEvent(
          id,
          asOk({ task, result: TaskRunResult.Success, persistence: TaskPersistence.Recurring })
        )
      );

      return expect(result).resolves.toEqual({ id });
    });

    test('rejects when the task run fails', () => {
      const events$ = new Subject<TaskLifecycleEvent>();
      const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';

      const taskScheduling = new TaskScheduling({
        ...taskSchedulingOpts,
        taskPollingLifecycle: taskPollingLifecycleMock.create({ events$ }),
      });

      const result = taskScheduling.runNow(id);

      const task = mockTask({ id });
      events$.next(asTaskClaimEvent(id, asOk(task)));
      events$.next(asTaskMarkRunningEvent(id, asOk(task)));
      events$.next(
        asTaskRunEvent(
          id,
          asErr({
            task,
            error: new Error('some thing gone wrong'),
            result: TaskRunResult.Failed,
            persistence: TaskPersistence.Recurring,
          })
        )
      );

      return expect(result).rejects.toMatchInlineSnapshot(
        `[Error: Failed to run task "01ddff11-e88a-4d13-bc4e-256164e755e2": Error: some thing gone wrong]`
      );
    });

    test('rejects when the task mark as running fails', () => {
      const events$ = new Subject<TaskLifecycleEvent>();
      const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';

      const taskScheduling = new TaskScheduling({
        ...taskSchedulingOpts,
        taskPollingLifecycle: taskPollingLifecycleMock.create({ events$ }),
      });

      const result = taskScheduling.runNow(id);

      const task = mockTask({ id });
      events$.next(asTaskClaimEvent(id, asOk(task)));
      events$.next(asTaskMarkRunningEvent(id, asErr(new Error('some thing gone wrong'))));

      return expect(result).rejects.toMatchInlineSnapshot(
        `[Error: Failed to run task "01ddff11-e88a-4d13-bc4e-256164e755e2": Error: some thing gone wrong]`
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

      const result = taskScheduling.runNow(id);

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

    test('when a task claim due to insufficient capacity we return an explciit message', async () => {
      const events$ = new Subject<TaskLifecycleEvent>();
      const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';

      mockTaskStore.getLifecycle.mockResolvedValue(TaskLifecycleResult.NotFound);

      const taskScheduling = new TaskScheduling({
        ...taskSchedulingOpts,
        taskPollingLifecycle: taskPollingLifecycleMock.create({ events$ }),
      });

      const result = taskScheduling.runNow(id);

      const task = mockTask({ id, taskType: 'foo' });
      events$.next(
        asTaskClaimEvent(
          id,
          asErr({ task: some(task), errorType: TaskClaimErrorType.CLAIMED_BY_ID_OUT_OF_CAPACITY })
        )
      );

      await expect(result).rejects.toEqual(
        new Error(
          `Failed to run task "${id}" as we would exceed the max concurrency of "${task.taskType}" which is 2. Rescheduled the task to ensure it is picked up as soon as possible.`
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

      const result = taskScheduling.runNow(id);

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

      const result = taskScheduling.runNow(id);

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

    test('rejects when the task run fails due to capacity', async () => {
      const events$ = new Subject<TaskLifecycleEvent>();
      const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';

      mockTaskStore.getLifecycle.mockResolvedValue(TaskStatus.Idle);

      const taskScheduling = new TaskScheduling({
        ...taskSchedulingOpts,
        taskPollingLifecycle: taskPollingLifecycleMock.create({ events$ }),
      });

      const result = taskScheduling.runNow(id);

      events$.next(asTaskRunRequestEvent(id, asErr(new Error('failed to buffer request'))));

      await expect(result).rejects.toEqual(
        new Error(`Failed to run task "${id}": Task Manager is at capacity, please try again later`)
      );
      expect(mockTaskStore.getLifecycle).not.toHaveBeenCalled();
    });

    test('when a task claim fails we return the underlying error if the task is idle', async () => {
      const events$ = new Subject<TaskLifecycleEvent>();
      const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';

      mockTaskStore.getLifecycle.mockResolvedValue(TaskStatus.Idle);

      const taskScheduling = new TaskScheduling({
        ...taskSchedulingOpts,
        taskPollingLifecycle: taskPollingLifecycleMock.create({ events$ }),
      });

      const result = taskScheduling.runNow(id);

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

      const result = taskScheduling.runNow(id);

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

    test('ignores task run success of other tasks', () => {
      const events$ = new Subject<TaskLifecycleEvent>();
      const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';
      const differentTask = '4bebf429-181b-4518-bb7d-b4246d8a35f0';

      const taskScheduling = new TaskScheduling({
        ...taskSchedulingOpts,
        taskPollingLifecycle: taskPollingLifecycleMock.create({ events$ }),
      });

      const result = taskScheduling.runNow(id);

      const task = mockTask({ id });
      const otherTask = { id: differentTask } as ConcreteTaskInstance;
      events$.next(asTaskClaimEvent(id, asOk(task)));
      events$.next(asTaskClaimEvent(differentTask, asOk(otherTask)));
      events$.next(
        asTaskRunEvent(
          differentTask,
          asOk({
            task: otherTask,
            result: TaskRunResult.Success,
            persistence: TaskPersistence.Recurring,
          })
        )
      );

      events$.next(
        asTaskRunEvent(
          id,
          asErr({
            task,
            error: new Error('some thing gone wrong'),
            result: TaskRunResult.Failed,
            persistence: TaskPersistence.Recurring,
          })
        )
      );

      return expect(result).rejects.toMatchInlineSnapshot(
        `[Error: Failed to run task "01ddff11-e88a-4d13-bc4e-256164e755e2": Error: some thing gone wrong]`
      );
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
