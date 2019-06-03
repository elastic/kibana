/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClient } from 'src/legacy/server/saved_objects';
import { SavedObjectReference } from './types';
import { Alert, RawAlert, AlertTypeRegistry, AlertAction } from './types';
import { TaskManager } from '../../task_manager';
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
  data: {
    interval: number;
    actions: AlertAction[];
    alertTypeParams: Record<string, any>;
  };
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
    // Throws an error if alert type isn't registered
    this.alertTypeRegistry.get(data.alertTypeId);
    // Create alert
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
    await this.savedObjectsClient.update(
      'alert',
      createdAlert.id,
      {
        scheduledTaskId: scheduledTask.id,
      },
      { references }
    );
    createdAlert.attributes.scheduledTaskId = scheduledTask.id;
    return this.getAlertFromRaw(createdAlert.id, createdAlert.attributes, references);
  }

  public async get({ id }: { id: string }) {
    const result = await this.savedObjectsClient.get('alert', id);
    return this.getAlertFromRaw(result.id, result.attributes, result.references);
  }

  public async find({ options = {} }: FindOptions = {}) {
    const results = await this.savedObjectsClient.find({
      ...options,
      type: 'alert',
    });
    return results.saved_objects.map(result =>
      this.getAlertFromRaw(result.id, result.attributes, result.references)
    );
  }

  public async delete({ id }: { id: string }) {
    const alertSavedObject = await this.savedObjectsClient.get('alert', id);
    const removeResult = await this.savedObjectsClient.delete('alert', id);
    await this.taskManager.remove(alertSavedObject.attributes.scheduledTaskId);
    return removeResult;
  }

  public async update({ id, data, options = {} }: UpdateOptions) {
    const { actions, references } = this.extractReferences(data.actions);
    const updatedObject = await this.savedObjectsClient.update<any>(
      'alert',
      id,
      {
        ...data,
        actions,
      },
      {
        ...options,
        references,
      }
    );
    return this.getAlertFromRaw(id, updatedObject.attributes, updatedObject.references);
  }

  private async scheduleAlert(id: string, alert: RawAlert) {
    return await this.taskManager.schedule({
      taskType: `alerting:${alert.alertTypeId}`,
      params: {
        alertId: id,
      },
      state: {
        // This is here because we can't rely on the task manager's internal runAt.
        // It changes it for timeout, etc when a task is running.
        scheduledRunAt: new Date(Date.now() + alert.interval),
        // This is here so the next task run knows what range to start from
        previousRange: {
          from: new Date(),
          to: new Date(),
        },
      },
      scope: [TASK_MANAGER_SCOPE],
    });
  }

  private extractReferences(actions: Alert['actions']) {
    const references: SavedObjectReference[] = [];
    const rawActions = actions.map((action, i) => {
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
      actions: rawActions,
      references,
    };
  }

  private injectReferencesIntoActions(
    actions: RawAlert['actions'],
    references: SavedObjectReference[]
  ) {
    return actions.map((action, i) => {
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
  }

  private getAlertFromRaw(id: string, rawAlert: RawAlert, references: SavedObjectReference[]) {
    const actions = this.injectReferencesIntoActions(rawAlert.actions, references);
    return {
      id,
      ...rawAlert,
      actions,
    };
  }

  private getRawAlert(alert: Alert) {
    const { references, actions } = this.extractReferences(alert.actions);
    return {
      alert: {
        ...alert,
        actions,
      },
      references,
    };
  }
}
