/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionsPlugin } from '../../actions';
import { TaskManager } from '../../task_manager';
import { AlertType, Alert } from './types';
import { getCreateTaskRunnerFunction } from './get_create_task_runner_function';

const taskManagerNamespace = 'alerting';

interface ConstructorOptions {
  taskManager: TaskManager;
  fireAction: ActionsPlugin['fire'];
}

export class AlertService {
  private taskManager: TaskManager;
  private fireAction: ActionsPlugin['fire'];

  constructor({ fireAction, taskManager }: ConstructorOptions) {
    this.taskManager = taskManager;
    this.fireAction = fireAction;
  }

  public registerType(alertType: AlertType) {
    this.taskManager.registerTaskDefinitions({
      [`${taskManagerNamespace}:${alertType.id}`]: {
        title: alertType.description,
        type: `${taskManagerNamespace}:${alertType.id}`,
        createTaskRunner: getCreateTaskRunnerFunction(alertType, this.fireAction),
      },
    });
  }

  public async create(alert: Alert) {
    await this.taskManager.schedule({
      taskType: `${taskManagerNamespace}:${alert.alertTypeId}`,
      params: alert,
      state: {},
    });
  }
}
