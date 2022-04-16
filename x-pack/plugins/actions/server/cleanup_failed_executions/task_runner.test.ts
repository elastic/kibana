/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { ActionsConfig } from '../config';
import { ActionsPluginsStart } from '../plugin';
import { ConcreteTaskInstance, TaskStatus } from '@kbn/task-manager-plugin/server';
import { loggingSystemMock, coreMock } from '@kbn/core/server/mocks';
import { actionTypeRegistryMock } from '../action_type_registry.mock';
import { taskRunner, TaskRunnerOpts } from './task_runner';

jest.mock('./find_and_cleanup_tasks', () => ({
  findAndCleanupTasks: jest.fn(),
}));

describe('taskRunner', () => {
  const logger = loggingSystemMock.create().get();
  const actionTypeRegistry = actionTypeRegistryMock.create();
  const coreStartServices = coreMock.createSetup().getStartServices() as Promise<
    [CoreStart, ActionsPluginsStart, unknown]
  >;

  const config: ActionsConfig['cleanupFailedExecutionsTask'] = {
    enabled: true,
    cleanupInterval: schema.duration().validate('5m'),
    idleInterval: schema.duration().validate('1h'),
    pageSize: 100,
  };

  const taskRunnerOpts: TaskRunnerOpts = {
    logger,
    coreStartServices,
    actionTypeRegistry,
    config,
    kibanaIndex: '.kibana',
    taskManagerIndex: '.kibana_task_manager',
  };

  const taskInstance: ConcreteTaskInstance = {
    id: '123',
    scheduledAt: new Date(),
    attempts: 0,
    status: TaskStatus.Running,
    state: { runs: 0, total_cleaned_up: 0 },
    runAt: new Date(),
    startedAt: new Date(),
    retryAt: new Date(),
    ownerId: '234',
    taskType: 'foo',
    params: {},
  };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.requireMock('./find_and_cleanup_tasks').findAndCleanupTasks.mockResolvedValue({
      success: true,
      successCount: 1,
      failureCount: 1,
      remaining: 0,
    });
  });

  describe('run', () => {
    it('should call findAndCleanupTasks with proper parameters', async () => {
      const runner = taskRunner(taskRunnerOpts)({ taskInstance });
      await runner.run();
      expect(jest.requireMock('./find_and_cleanup_tasks').findAndCleanupTasks).toHaveBeenCalledWith(
        taskRunnerOpts
      );
    });

    it('should update state to reflect cleanup result', async () => {
      const runner = taskRunner(taskRunnerOpts)({ taskInstance });
      const { state } = await runner.run();
      expect(state).toEqual({
        runs: 1,
        total_cleaned_up: 1,
      });
    });

    it('should return idle schedule when no remaining tasks to cleanup', async () => {
      const runner = taskRunner(taskRunnerOpts)({ taskInstance });
      const { schedule } = await runner.run();
      expect(schedule).toEqual({
        interval: '60m',
      });
    });

    it('should return cleanup schedule when there are some remaining tasks to cleanup', async () => {
      jest.requireMock('./find_and_cleanup_tasks').findAndCleanupTasks.mockResolvedValue({
        success: true,
        successCount: 1,
        failureCount: 1,
        remaining: 1,
      });
      const runner = taskRunner(taskRunnerOpts)({ taskInstance });
      const { schedule } = await runner.run();
      expect(schedule).toEqual({
        interval: '5m',
      });
    });
  });
});
