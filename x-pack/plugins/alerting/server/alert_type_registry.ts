/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { i18n } from '@kbn/i18n';
import { SavedObjectsClientContract } from 'src/legacy/server/saved_objects';
import { AlertType } from './types';
import { TaskManager } from '../../task_manager';
import { getCreateTaskRunnerFunction } from './lib';
import { ActionsPlugin } from '../../actions';

interface ConstructorOptions {
  taskManager: TaskManager;
  fireAction: ActionsPlugin['fire'];
  savedObjectsClient: SavedObjectsClientContract;
}

export class AlertTypeRegistry {
  private taskManager: TaskManager;
  private fireAction: ActionsPlugin['fire'];
  private alertTypes: Record<string, AlertType> = {};
  private savedObjectsClient: SavedObjectsClientContract;

  constructor({ savedObjectsClient, fireAction, taskManager }: ConstructorOptions) {
    this.taskManager = taskManager;
    this.fireAction = fireAction;
    this.savedObjectsClient = savedObjectsClient;
  }

  public has(id: string) {
    return !!this.alertTypes[id];
  }

  public register(alertType: AlertType) {
    if (this.has(alertType.id)) {
      throw new Error(
        i18n.translate('xpack.alerting.alertTypeRegistry.register.duplicateAlertTypeError', {
          defaultMessage: 'Alert type "{id}" is already registered.',
          values: {
            id: alertType.id,
          },
        })
      );
    }
    this.alertTypes[alertType.id] = alertType;
    this.taskManager.registerTaskDefinitions({
      [`alerting:${alertType.id}`]: {
        title: alertType.description,
        type: `alerting:${alertType.id}`,
        createTaskRunner: getCreateTaskRunnerFunction({
          alertType,
          fireAction: this.fireAction,
          savedObjectsClient: this.savedObjectsClient,
        }),
      },
    });
  }

  public get(id: string) {
    if (!this.has(id)) {
      throw Boom.badRequest(
        i18n.translate('xpack.alerting.alertTypeRegistry.get.missingAlertTypeError', {
          defaultMessage: 'Alert type "{id}" is not registered.',
          values: {
            id,
          },
        })
      );
    }
    return this.alertTypes[id];
  }

  public list() {
    return Object.entries(this.alertTypes).map(([alertTypeId, alertType]) => ({
      id: alertTypeId,
      description: alertType.description,
    }));
  }
}
