/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ConcreteTaskInstance, TaskStatus } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { TYPE, VERSION } from './constants';

const createRiskScoringTaskInstanceMock = (
  overrides: Partial<ConcreteTaskInstance> = {}
): ConcreteTaskInstance =>
  taskManagerMock.createTask({
    id: `${TYPE}:${VERSION}`,
    runAt: new Date(),
    attempts: 0,
    ownerId: '',
    status: TaskStatus.Running,
    startedAt: new Date(),
    scheduledAt: new Date(),
    retryAt: new Date(),
    params: {},
    state: {},
    taskType: TYPE,
  });

export const riskScoringTaskMock = {
  createInstance: createRiskScoringTaskInstanceMock,
};
