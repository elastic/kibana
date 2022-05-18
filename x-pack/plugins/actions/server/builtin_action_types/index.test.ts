/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionExecutor, TaskRunnerFactory } from '../lib';
import { ActionTypeRegistry } from '../action_type_registry';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { registerBuiltInActionTypes } from '.';
import { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsConfigMock } from '../actions_config.mock';
import { licenseStateMock } from '../lib/license_state.mock';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { inMemoryMetricsMock } from '../monitoring/in_memory_metrics.mock';

const ACTION_TYPE_IDS = [
  '.index',
  '.email',
  '.pagerduty',
  '.server-log',
  '.slack',
  '.swimlane',
  '.teams',
  '.webhook',
  '.xmatters',
];

export function createActionTypeRegistry(): {
  logger: jest.Mocked<Logger>;
  actionTypeRegistry: ActionTypeRegistry;
} {
  const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
  const inMemoryMetrics = inMemoryMetricsMock.create();
  const actionTypeRegistry = new ActionTypeRegistry({
    taskManager: taskManagerMock.createSetup(),
    licensing: licensingMock.createSetup(),
    taskRunnerFactory: new TaskRunnerFactory(
      new ActionExecutor({ isESOCanEncrypt: true }),
      inMemoryMetrics
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
    ACTION_TYPE_IDS.forEach((id) => expect(actionTypeRegistry.has(id)).toEqual(true));
  });
});
