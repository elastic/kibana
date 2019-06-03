/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TaskManager } from '../../../task_manager';

const createTaskManagerMock = () =>
  ({
    schedule: jest.fn() as TaskManager['schedule'],
    registerTaskDefinitions: jest.fn() as TaskManager['registerTaskDefinitions'],
  } as TaskManager);

export const taskManagerMock = {
  create: createTaskManagerMock,
};
