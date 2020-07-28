/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { taskManagerMock } from '../../../../../task_manager/server/mocks';
import { TaskStatus } from '../../../../../task_manager/server';

import { createMockEndpointAppContext } from '../../mocks';

import { ManifestTaskConstants, ManifestTask } from './task';
import { MockManifestTask } from './task.mock';

describe('task', () => {
  describe('Periodic task sanity checks', () => {
    test('can create task', () => {
      const manifestTask = new ManifestTask({
        endpointAppContext: createMockEndpointAppContext(),
        taskManager: taskManagerMock.createSetup(),
      });
      expect(manifestTask).toBeInstanceOf(ManifestTask);
    });

    test('task should be registered', () => {
      const mockTaskManager = taskManagerMock.createSetup();
      new ManifestTask({
        endpointAppContext: createMockEndpointAppContext(),
        taskManager: mockTaskManager,
      });
      expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalled();
    });

    test('task should be scheduled', async () => {
      const mockTaskManagerSetup = taskManagerMock.createSetup();
      const manifestTask = new ManifestTask({
        endpointAppContext: createMockEndpointAppContext(),
        taskManager: mockTaskManagerSetup,
      });
      const mockTaskManagerStart = taskManagerMock.createStart();
      manifestTask.start({ taskManager: mockTaskManagerStart });
      expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalled();
    });

    test('task should run', async () => {
      const mockContext = createMockEndpointAppContext();
      const mockTaskManager = taskManagerMock.createSetup();
      const mockManifestTask = new MockManifestTask({
        endpointAppContext: mockContext,
        taskManager: mockTaskManager,
      });
      const mockTaskInstance = {
        id: ManifestTaskConstants.TYPE,
        runAt: new Date(),
        attempts: 0,
        ownerId: '',
        status: TaskStatus.Running,
        startedAt: new Date(),
        scheduledAt: new Date(),
        retryAt: new Date(),
        params: {},
        state: {},
        taskType: ManifestTaskConstants.TYPE,
      };
      const createTaskRunner =
        mockTaskManager.registerTaskDefinitions.mock.calls[0][0][ManifestTaskConstants.TYPE]
          .createTaskRunner;
      const taskRunner = createTaskRunner({ taskInstance: mockTaskInstance });
      await taskRunner.run();
      expect(mockManifestTask.runTask).toHaveBeenCalled();
    });
  });
});
