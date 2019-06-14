/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { i18n } from '@kbn/i18n';
import { SavedObjectsClientContract } from 'src/legacy/server/saved_objects';
import { AlertType, Services } from './types';
import { TaskManager } from '../../task_manager';
import { getCreateTaskRunnerFunction } from './lib';
import { ActionsPlugin } from '../../actions';

interface ConstructorOptions {
  getServices: (basePath: string) => Services;
  taskManager: TaskManager;
  fireAction: ActionsPlugin['fire'];
  internalSavedObjectsRepository: SavedObjectsClientContract;
}

export class AlertTypeRegistry {
  private getServices: (basePath: string) => Services;
  private taskManager: TaskManager;
  private fireAction: ActionsPlugin['fire'];
  private alertTypes: Record<string, AlertType> = {};
  private internalSavedObjectsRepository: SavedObjectsClientContract;

  constructor({
    internalSavedObjectsRepository,
    fireAction,
    taskManager,
    getServices,
  }: ConstructorOptions) {
    this.taskManager = taskManager;
    this.fireAction = fireAction;
    this.internalSavedObjectsRepository = internalSavedObjectsRepository;
    this.getServices = getServices;
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
        title: alertType.name,
        type: `alerting:${alertType.id}`,
        createTaskRunner: getCreateTaskRunnerFunction({
          alertType,
          getServices: this.getServices,
          fireAction: this.fireAction,
          internalSavedObjectsRepository: this.internalSavedObjectsRepository,
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
      name: alertType.name,
    }));
  }
}
