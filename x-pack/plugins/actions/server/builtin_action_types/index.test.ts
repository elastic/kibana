/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionExecutor, TaskRunnerFactory } from '../lib';
import { ActionTypeRegistry } from '../action_type_registry';
import { taskManagerMock } from '../../../task_manager/server/task_manager.mock';
import { registerBuiltInActionTypes } from './index';
import { Logger } from '../../../../../src/core/server';
import { loggingSystemMock } from '../../../../../src/core/server/mocks';
import { actionsConfigMock } from '../actions_config.mock';
import { licenseStateMock } from '../lib/license_state.mock';

const ACTION_TYPE_IDS = ['.index', '.email', '.pagerduty', '.server-log', '.slack', '.webhook'];

export function createActionTypeRegistry(): {
  logger: jest.Mocked<Logger>;
  actionTypeRegistry: ActionTypeRegistry;
} {
  const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
  const actionTypeRegistry = new ActionTypeRegistry({
    taskManager: taskManagerMock.setup(),
    taskRunnerFactory: new TaskRunnerFactory(
      new ActionExecutor({ isESOUsingEphemeralEncryptionKey: false })
    ),
    actionsConfigUtils: actionsConfigMock.create(),
    licenseState: licenseStateMock.create(),
    preconfiguredActions: [],
  });
  registerBuiltInActionTypes({
    logger,
    actionTypeRegistry,
    actionsConfigUtils: actionsConfigMock.create(),
  });
  return { logger, actionTypeRegistry };
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('action is registered', () => {
  test('gets registered with builtin actions', () => {
    const { actionTypeRegistry } = createActionTypeRegistry();
    ACTION_TYPE_IDS.forEach((ACTION_TYPE_ID) =>
      expect(actionTypeRegistry.has(ACTION_TYPE_ID)).toEqual(true)
    );
  });
});
