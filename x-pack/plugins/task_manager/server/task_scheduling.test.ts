/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { Subject } from 'rxjs';
import { none } from 'fp-ts/lib/Option';

import {
  asTaskMarkRunningEvent,
  asTaskRunEvent,
  asTaskClaimEvent,
  asTaskRunRequestEvent,
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

describe('TaskScheduling', () => {
  const mockTaskStore = taskStoreMock.create({});
  const mockTaskManager = taskPollingLifecycleMock.create({});
  const taskSchedulingOpts = {
    taskStore: mockTaskStore,
    taskPollingLifecycle: mockTaskManager,
    logger: mockLogger(),
    middleware: createInitialMiddleware(),
  };

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

      const task = { id } as ConcreteTaskInstance;
      events$.next(asTaskRunEvent(id, asOk({ task, result: TaskRunResult.Success })));

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

      const task = { id } as ConcreteTaskInstance;
      events$.next(asTaskClaimEvent(id, asOk(task)));
      events$.next(asTaskMarkRunningEvent(id, asOk(task)));
      events$.next(
        asTaskRunEvent(
          id,
          asErr({
            task,
            error: new Error('some thing gone wrong'),
            result: TaskRunResult.Failed,
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

      const task = { id } as ConcreteTaskInstance;
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

      events$.next(asTaskClaimEvent(id, asErr(none)));

      await expect(result).rejects.toEqual(
        new Error(`Failed to run task "${id}" as it does not exist`)
      );

      expect(mockTaskStore.getLifecycle).toHaveBeenCalledWith(id);
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

      events$.next(asTaskClaimEvent(id, asErr(none)));

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

      events$.next(asTaskClaimEvent(id, asErr(none)));

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

      events$.next(asTaskClaimEvent(id, asErr(none)));

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

      events$.next(asTaskClaimEvent(id, asErr(none)));

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

      const task = { id } as ConcreteTaskInstance;
      const otherTask = { id: differentTask } as ConcreteTaskInstance;
      events$.next(asTaskClaimEvent(id, asOk(task)));
      events$.next(asTaskClaimEvent(differentTask, asOk(otherTask)));
      events$.next(
        asTaskRunEvent(differentTask, asOk({ task: otherTask, result: TaskRunResult.Success }))
      );

      events$.next(
        asTaskRunEvent(
          id,
          asErr({
            task,
            error: new Error('some thing gone wrong'),
            result: TaskRunResult.Failed,
          })
        )
      );

      return expect(result).rejects.toMatchInlineSnapshot(
        `[Error: Failed to run task "01ddff11-e88a-4d13-bc4e-256164e755e2": Error: some thing gone wrong]`
      );
    });
  });
});
