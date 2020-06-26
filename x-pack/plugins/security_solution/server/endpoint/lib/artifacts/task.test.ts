/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { taskManagerMock } from '../../../../../task_manager/server/mocks';

import { createMockEndpointAppContext } from '../../mocks';

import { getMockPackagerTaskScheduler } from './task.mock';

import { setupPackagerTask } from './task';

describe('task', () => {
  describe('Periodic task sanity checks', () => {
    test('setupPackagerTask runs and returns task scheduler', () => {
      const packagerTask = setupPackagerTask({
        endpointAppContext: createMockEndpointAppContext(),
        taskManager: taskManagerMock.createSetup(),
      });
      expect(packagerTask).toHaveProperty('getTaskScheduler');
    });

    test('task should be registered', () => {
      const mockTaskManager = taskManagerMock.createSetup();
      const packagerTask = setupPackagerTask({
        endpointAppContext: createMockEndpointAppContext(),
        taskManager: mockTaskManager,
      });
      expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalled();
    });

    test('task should be scheduled', async () => {
      const mockTaskManager = taskManagerMock.createStart();
      const taskScheduler = getMockPackagerTaskScheduler(mockTaskManager);
      await taskScheduler.run();
      expect(mockTaskManager.ensureScheduled).toHaveBeenCalled();
    });

    test('task should run', async () => {
      // TODO
    });
  });
});
