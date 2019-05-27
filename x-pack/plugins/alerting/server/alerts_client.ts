/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Alert } from './types';
import { TaskManager } from '../../task_manager';

interface ConstructorOptions {
  taskManager: TaskManager;
}

export class AlertsClient {
  private taskManager: TaskManager;

  constructor({ taskManager }: ConstructorOptions) {
    this.taskManager = taskManager;
  }

  public async create(alert: Alert) {
    await this.taskManager.schedule({
      taskType: `alerting:${alert.alertTypeId}`,
      params: alert,
      state: {},
    });
  }
}
