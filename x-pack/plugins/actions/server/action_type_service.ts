/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { i18n } from '@kbn/i18n';
import { ActionType, Services } from './types';
import { TaskManager } from '../../task_manager';
import { getCreateTaskRunnerFunction } from './get_create_task_runner_function';
import { EncryptedSavedObjectsPlugin } from '../../encrypted_saved_objects';

interface ConstructorOptions {
  services: Services;
  taskManager: TaskManager;
  encryptedSavedObjectsPlugin: EncryptedSavedObjectsPlugin;
}

export class ActionTypeService {
  private services: Services;
  private taskManager: TaskManager;
  private actionTypes: Record<string, ActionType> = {};
  private encryptedSavedObjectsPlugin: EncryptedSavedObjectsPlugin;

  constructor({ services, taskManager, encryptedSavedObjectsPlugin }: ConstructorOptions) {
    this.services = services;
    this.taskManager = taskManager;
    this.encryptedSavedObjectsPlugin = encryptedSavedObjectsPlugin;
  }

  /**
   * Returns if the action type service has the given action type registered
   */
  public has(id: string) {
    return !!this.actionTypes[id];
  }

  /**
   * Registers an action type to the action type service
   */
  public register(actionType: ActionType) {
    if (this.has(actionType.id)) {
      throw new Error(
        i18n.translate('xpack.actions.actionTypeService.register.duplicateActionTypeError', {
          defaultMessage: 'Action type "{id}" is already registered.',
          values: {
            id: actionType.id,
          },
        })
      );
    }
    this.actionTypes[actionType.id] = actionType;
    this.taskManager.registerTaskDefinitions({
      [`actions:${actionType.id}`]: {
        title: actionType.name,
        type: `actions:${actionType.id}`,
        createTaskRunner: getCreateTaskRunnerFunction({
          services: this.services,
          actionType,
          encryptedSavedObjectsPlugin: this.encryptedSavedObjectsPlugin,
        }),
      },
    });
  }

  /**
   * Returns an action type, throws if not registered
   */
  public get(id: string) {
    if (!this.has(id)) {
      throw Boom.badRequest(
        i18n.translate('xpack.actions.actionTypeService.get.missingActionTypeError', {
          defaultMessage: 'Action type "{id}" is not registered.',
          values: {
            id,
          },
        })
      );
    }
    return this.actionTypes[id];
  }

  /**
   * Returns attributes to be treated as unencrypted
   */
  public getUnencryptedAttributes(id: string) {
    const actionType = this.get(id);
    return actionType.unencryptedAttributes || [];
  }

  /**
   * Returns a list of registered action types [{ id, name }]
   */
  public list() {
    return Object.entries(this.actionTypes).map(([actionTypeId, actionType]) => ({
      id: actionTypeId,
      name: actionType.name,
    }));
  }
}
