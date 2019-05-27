/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClient } from 'src/legacy/server/saved_objects';
import { SavedObjectReference } from './types';
import { Alert } from './types';
import { TaskManager } from '../../task_manager';
import { AlertTypeRegistry } from './alert_type_registry';

interface ConstructorOptions {
  taskManager: TaskManager;
  savedObjectsClient: SavedObjectsClient;
  alertTypeRegistry: AlertTypeRegistry;
}

interface FindOptions {
  options?: {
    perPage?: number;
    page?: number;
    search?: string;
    defaultSearchOperator?: 'AND' | 'OR';
    searchFields?: string[];
    sortField?: string;
    hasReference?: {
      type: string;
      id: string;
    };
    fields?: string[];
  };
}

interface CreateOptions {
  data: Alert;
  options?: {
    migrationVersion?: Record<string, string>;
    references?: SavedObjectReference[];
  };
}

interface UpdateOptions {
  id: string;
  data: Alert;
  options?: { version?: string; references?: SavedObjectReference[] };
}

export class AlertsClient {
  private taskManager: TaskManager;
  private savedObjectsClient: SavedObjectsClient;
  private alertTypeRegistry: AlertTypeRegistry;

  constructor({ alertTypeRegistry, savedObjectsClient, taskManager }: ConstructorOptions) {
    this.taskManager = taskManager;
    this.alertTypeRegistry = alertTypeRegistry;
    this.savedObjectsClient = savedObjectsClient;
  }

  public async create({ data, options }: CreateOptions) {
    const createdAlert = await this.savedObjectsClient.create<any>('alert', data, options);
    const scheduledTask = await this.scheduleAlert(createdAlert.id, data);
    const updatedAlert = await this.savedObjectsClient.update('alert', createdAlert.id, {
      scheduledTaskId: scheduledTask.id,
    });
    return {
      ...createdAlert,
      attributes: {
        ...createdAlert.attributes,
        ...updatedAlert.attributes,
      },
    };
  }

  public async get({ id }: { id: string }) {
    return await this.savedObjectsClient.get('alert', id);
  }

  public async find({ options = {} }: FindOptions) {
    return await this.savedObjectsClient.find({
      ...options,
      type: 'alert',
    });
  }

  public async delete({ id }: { id: string }) {
    const alertSavedObject = await this.savedObjectsClient.get('alert', id);
    await this.taskManager.remove(alertSavedObject.attributes.scheduledTaskId);
    return await this.savedObjectsClient.delete('alert', id);
  }

  public async update({ id, data, options = {} }: UpdateOptions) {
    const { alertTypeId, interval } = data;
    // Throws an error if alert type is invalid
    this.alertTypeRegistry.get(alertTypeId);
    // Re-create scheduled task if alertTypeId or interval changed
    const currentSavedObject = await this.savedObjectsClient.get('alert', id);
    if (
      currentSavedObject.attributes.alertTypeId !== alertTypeId ||
      currentSavedObject.attributes.interval !== interval
    ) {
      await this.taskManager.remove(currentSavedObject.attributes.scheduledTaskId);
      const scheduledTask = await this.scheduleAlert(id, data);
      data.scheduledTaskId = scheduledTask.id;
    }
    return await this.savedObjectsClient.update<any>('alert', id, data, options);
  }

  private async scheduleAlert(id: string, alert: Alert) {
    return await this.taskManager.schedule({
      taskType: `alerting:${alert.alertTypeId}`,
      params: {
        alertId: id,
      },
      state: {},
    });
  }
}
