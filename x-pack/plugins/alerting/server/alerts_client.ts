/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClient } from 'src/legacy/server/saved_objects';
import { Alert } from './types';
import { TaskManager } from '../../task_manager';

interface ConstructorOptions {
  taskManager: TaskManager;
  savedObjectsClient: SavedObjectsClient;
}

export class AlertsClient {
  private taskManager: TaskManager;
  private savedObjectsClient: SavedObjectsClient;

  constructor({ savedObjectsClient, taskManager }: ConstructorOptions) {
    this.taskManager = taskManager;
    this.savedObjectsClient = savedObjectsClient;
  }

  public async create(alert: Alert) {
    const createdAlert = await this.savedObjectsClient.create<any>('alert', alert);
    const scheduledTask = await this.taskManager.schedule({
      taskType: `alerting:${alert.alertTypeId}`,
      params: {
        alertId: createdAlert.id,
      },
      state: {},
    });
    await this.savedObjectsClient.update('alert', createdAlert.id, {
      scheduledTaskId: scheduledTask.id,
    });
  }
}
