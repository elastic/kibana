/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClient } from 'src/legacy/server/saved_objects';
import { SavedObjectReference } from './types';
import { Alert, RawAlert } from './types';
import { TaskManager } from '../../task_manager';
import { AlertTypeRegistry } from './alert_type_registry';
import { TASK_MANAGER_SCOPE } from '../common/constants';

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
    const { alert: rawAlert, references } = this.getRawAlert(data);
    const createdAlert = await this.savedObjectsClient.create<any>('alert', rawAlert, {
      ...options,
      references,
    });
    let scheduledTask;
    try {
      scheduledTask = await this.scheduleAlert(createdAlert.id, rawAlert);
    } catch (e) {
      // Cleanup data, something went wrong scheduling the task
      await this.savedObjectsClient.delete('alert', createdAlert.id);
      throw e;
    }
    await this.savedObjectsClient.update('alert', createdAlert.id, {
      scheduledTaskId: scheduledTask.id,
    });
    createdAlert.attributes.scheduledTaskId = scheduledTask.id;
    return this.getAlertFromRaw(createdAlert.attributes, references);
  }

  public async get({ id }: { id: string }) {
    const result = await this.savedObjectsClient.get('alert', id);
    return this.getAlertFromRaw(result.attributes, result.references);
  }

  public async find({ options = {} }: FindOptions) {
    const results = await this.savedObjectsClient.find({
      ...options,
      type: 'alert',
    });
    return results.saved_objects.map(result =>
      this.getAlertFromRaw(result.attributes, result.references)
    );
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
    const { alert: rawAlert, references } = this.getRawAlert(data);
    const updatedObject = await this.savedObjectsClient.update<any>('alert', id, alert, {
      ...options,
      references,
    });
    if (this.shouldRescheduleTask(currentSavedObject.attributes, data)) {
      await this.taskManager.remove(currentSavedObject.attributes.scheduledTaskId);
      const scheduledTask = await this.scheduleAlert(id, rawAlert);
      await this.savedObjectsClient.update<any>('alert', id, {
        scheduledTaskId: scheduledTask.id,
      });
      updatedObject.attributes.scheduledTaskId = scheduledTask.id;
    }
    return this.getAlertFromRaw(updatedObject.attributes, updatedObject.references);
  }

  private shouldRescheduleTask(previousAlert: Alert, updatedAlert: Alert) {
    return (
      previousAlert.alertTypeId !== updatedAlert.alertTypeId ||
      previousAlert.interval !== updatedAlert.interval
    );
  }

  private async scheduleAlert(id: string, alert: RawAlert) {
    return await this.taskManager.schedule({
      taskType: `alerting:${alert.alertTypeId}`,
      params: {
        alertId: id,
      },
      state: {},
      scope: [TASK_MANAGER_SCOPE],
    });
  }

  private getAlertFromRaw(rawAlert: RawAlert, references: SavedObjectReference[]) {
    const actions = rawAlert.actions.map((action, i) => {
      const reference = references.find(ref => ref.name === action.actionRef);
      if (!reference) {
        throw new Error(`Reference ${action.actionRef} not found`);
      }
      return {
        ...action,
        actionRef: undefined,
        id: reference.id,
      };
    });
    return {
      ...rawAlert,
      actions,
    };
  }

  private getRawAlert(alert: Alert): { references: SavedObjectReference[]; alert: RawAlert } {
    const references: SavedObjectReference[] = [];
    const rawActions = alert.actions.map((action, i) => {
      const actionRef = `action_${i}`;
      references.push({
        name: actionRef,
        type: 'action',
        id: action.id,
      });
      return {
        ...action,
        id: undefined,
        actionRef,
      };
    });
    return {
      alert: {
        ...alert,
        actions: rawActions,
      },
      references,
    };
  }
}
