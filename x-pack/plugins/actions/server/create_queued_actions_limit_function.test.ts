/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { actionsConfigMock } from './actions_config.mock';
import { createQueuedActionsLimitFunction } from './create_queued_actions_limit_function';

const mockTaskManager = taskManagerMock.createStart();
const mockActionsConfig = actionsConfigMock.create();
const doc = {} as ConcreteTaskInstance;

beforeEach(() => jest.resetAllMocks());

describe('createQueuedActionsLimitFunction()', () => {
  test('returns true if the number of queued actions is greater than the config limit', async () => {
    mockTaskManager.fetch.mockResolvedValueOnce({ docs: [doc, doc, doc] });
    mockActionsConfig.getQueuedMax.mockReturnValueOnce(2);

    const executeFn = createQueuedActionsLimitFunction({
      taskManager: mockTaskManager,
      configurationUtilities: mockActionsConfig,
    });
    expect(await executeFn()).toBe(true);
  });

  test('returns true if the number of queued actions is equal the config limit', async () => {
    mockTaskManager.fetch.mockResolvedValueOnce({ docs: [doc, doc] });
    mockActionsConfig.getQueuedMax.mockReturnValueOnce(3);

    const executeFn = createQueuedActionsLimitFunction({
      taskManager: mockTaskManager,
      configurationUtilities: mockActionsConfig,
    });
    expect(await executeFn()).toBe(true);
  });

  test('returns false if the number of queued actions is less than the config limit', async () => {
    mockTaskManager.fetch.mockResolvedValueOnce({ docs: [doc] });
    mockActionsConfig.getQueuedMax.mockReturnValueOnce(3);

    const executeFn = createQueuedActionsLimitFunction({
      taskManager: mockTaskManager,
      configurationUtilities: mockActionsConfig,
    });
    expect(await executeFn()).toBe(false);
  });
});
