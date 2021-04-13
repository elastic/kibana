/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, CoreStart } from 'kibana/server';
import { TASK_TYPE } from './constants';
import { ActionsConfig } from '../config';
import { taskRunner } from './task_runner';
import { ActionsPluginsStart } from '../plugin';
import { ActionTypeRegistry } from '../action_type_registry';
import { TaskManagerSetupContract } from '../../../task_manager/server';

export function registerTaskDefinition(
  logger: Logger,
  coreStartServices: Promise<[CoreStart, ActionsPluginsStart, unknown]>,
  taskManager: TaskManagerSetupContract,
  actionTypeRegistry: ActionTypeRegistry,
  config: ActionsConfig['cleanupFailedExecutionsTask']
) {
  taskManager.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Cleanup failed action executions',
      createTaskRunner: taskRunner(logger, actionTypeRegistry, coreStartServices, config),
    },
  });
}
