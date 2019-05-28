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
  };
}

interface UpdateOptions {
  id: string;
  data: Alert;
  options?: { version?: string };
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
    const references = this.extractReferences(data);
    const createdAlert = await this.savedObjectsClient.create<any>('alert', data, {
      ...options,
      references,
    });
    const scheduledTask = await this.scheduleAlert(createdAlert.id, data);
    await this.savedObjectsClient.update('alert', createdAlert.id, {
      scheduledTaskId: scheduledTask.id,
    });
    createdAlert.attributes.scheduledTaskId = scheduledTask.id;
    return createdAlert;
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
    const removeResult = await this.savedObjectsClient.delete('alert', id);
    await this.taskManager.remove(alertSavedObject.attributes.scheduledTaskId);
    return removeResult;
  }

  public async update({ id, data, options = {} }: UpdateOptions) {
    // Throws an error if alert type is invalid
    this.alertTypeRegistry.get(data.alertTypeId);
    // Re-create scheduled task if alertTypeId or interval changed
    const currentSavedObject = await this.savedObjectsClient.get('alert', id);
    const references = this.extractReferences(data);
    const updatedObject = await this.savedObjectsClient.update<any>('alert', id, data, {
      ...options,
      references,
    });
    if (this.shouldRescheduleTask(currentSavedObject.attributes, data)) {
      await this.taskManager.remove(currentSavedObject.attributes.scheduledTaskId);
      const scheduledTask = await this.scheduleAlert(id, data);
      await this.savedObjectsClient.update<any>('alert', id, {
        scheduledTaskId: scheduledTask.id,
      });
      updatedObject.attributes.scheduledTaskId = scheduledTask.id;
    }
    return updatedObject;
  }

  private shouldRescheduleTask(previousAlert: Alert, updatedAlert: Alert) {
    return (
      previousAlert.alertTypeId !== updatedAlert.alertTypeId ||
      previousAlert.interval !== updatedAlert.interval
    );
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

  private extractReferences(alert: Alert) {
    const references: SavedObjectReference[] = [];
    for (let i = 0; i < alert.actions.length; i++) {
      references.push({
        name: `action_${i}`,
        type: 'action',
        id: alert.actions[i].id,
      });
    }
    return references;
  }
}
