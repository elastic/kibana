/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionsPlugin } from '../../actions';
import { TaskManager } from '../../task_manager';
import { AlertDefinition, ScheduledAlert } from './types';
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

  public register(alert: AlertDefinition) {
    this.taskManager.registerTaskDefinitions({
      [`${taskManagerNamespace}:${alert.id}`]: {
        title: alert.description,
        type: `${taskManagerNamespace}:${alert.id}`,
        createTaskRunner: getCreateTaskRunnerFunction(alert, this.fireAction),
      },
    });
  }

  public async schedule(scheduledAlert: ScheduledAlert) {
    await this.taskManager.schedule({
      taskType: `${taskManagerNamespace}:${scheduledAlert.alertId}`,
      params: scheduledAlert,
      state: {},
    });
  }
}
