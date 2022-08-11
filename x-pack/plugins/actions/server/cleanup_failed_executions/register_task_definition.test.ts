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
import { registerTaskDefinition } from './register_task_definition';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { loggingSystemMock, coreMock } from '@kbn/core/server/mocks';
import { actionTypeRegistryMock } from '../action_type_registry.mock';
import { TaskRunnerOpts } from './task_runner';

jest.mock('./task_runner', () => ({ taskRunner: jest.fn() }));

describe('registerTaskDefinition', () => {
  const logger = loggingSystemMock.create().get();
  const taskManager = taskManagerMock.createSetup();
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

  beforeEach(() => {
    jest.resetAllMocks();
    jest.requireMock('./task_runner').taskRunner.mockReturnValue(jest.fn());
  });

  it('should call registerTaskDefinitions with proper parameters', () => {
    registerTaskDefinition(taskManager, taskRunnerOpts);
    expect(taskManager.registerTaskDefinitions).toHaveBeenCalledTimes(1);
    expect(taskManager.registerTaskDefinitions.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "cleanup_failed_action_executions": Object {
              "createTaskRunner": [MockFunction],
              "title": "Cleanup failed action executions",
            },
          },
        ],
      ]
    `);
  });

  it('should call taskRunner with proper parameters', () => {
    registerTaskDefinition(taskManager, taskRunnerOpts);
    const { taskRunner } = jest.requireMock('./task_runner');
    expect(taskRunner).toHaveBeenCalledWith(taskRunnerOpts);
  });
});
