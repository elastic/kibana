/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { taskManagerStartContract } from '../../../../../task_manager/server';

import { taskManagerMock } from '../../../../../task_manager/server/mocks';

import { createMockEndpointAppContext } from '../../mocks';

import { PackagerTaskScheduler, setupPackagerTask } from './task';

export const getMockPackagerTaskScheduler = (
  taskManagerStart: TaskManagerStartContract
): PackagerTaskScheduler => {
  const packagerTask = setupPackagerTask({
    endpointAppContext: createMockEndpointAppContext(),
    taskManager: taskManagerMock.createSetup(),
  });
  return packagerTask.getTaskScheduler({ taskManager: taskManagerStart });
};
