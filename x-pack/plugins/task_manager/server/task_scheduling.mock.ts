/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TaskScheduling } from './task_scheduling';

const createTaskSchedulingMock = () => {
  return ({
    ensureScheduled: jest.fn(),
    schedule: jest.fn(),
    runNow: jest.fn(),
  } as unknown) as jest.Mocked<TaskScheduling>;
};

export const taskSchedulingMock = {
  create: createTaskSchedulingMock,
};
