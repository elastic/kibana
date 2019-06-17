/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { i18n } from '@kbn/i18n';
import { ActionType, Services } from './types';
import { TaskManager } from '../../task_manager';
import { getCreateTaskRunnerFunction } from './lib';
import { EncryptedSavedObjectsPlugin } from '../../encrypted_saved_objects';

interface ConstructorOptions {
  getServices: (basePath: string) => Services;
  taskManager: TaskManager;
  encryptedSavedObjectsPlugin: EncryptedSavedObjectsPlugin;
}

export class ActionTypeRegistry {
  private readonly getServices: (basePath: string) => Services;
  private readonly taskManager: TaskManager;
  private readonly actionTypes: Map<string, ActionType> = new Map();
  private readonly encryptedSavedObjectsPlugin: EncryptedSavedObjectsPlugin;

  constructor({ getServices, taskManager, encryptedSavedObjectsPlugin }: ConstructorOptions) {
    this.getServices = getServices;
    this.taskManager = taskManager;
    this.encryptedSavedObjectsPlugin = encryptedSavedObjectsPlugin;
  }

  /**
   * Returns if the action type registry has the given action type registered
   */
  public has(id: string) {
    return this.actionTypes.has(id);
  }

  /**
   * Registers an action type to the action type registry
   */
  public register(actionType: ActionType) {
    if (this.has(actionType.id)) {
      throw new Error(
        i18n.translate('xpack.actions.actionTypeRegistry.register.duplicateActionTypeError', {
          defaultMessage: 'Action type "{id}" is already registered.',
          values: {
            id: actionType.id,
          },
        })
      );
    }
    this.actionTypes.set(actionType.id, actionType);
    this.taskManager.registerTaskDefinitions({
      [`actions:${actionType.id}`]: {
        title: actionType.name,
        type: `actions:${actionType.id}`,
        createTaskRunner: getCreateTaskRunnerFunction({
          actionType,
          getServices: this.getServices,
          encryptedSavedObjectsPlugin: this.encryptedSavedObjectsPlugin,
        }),
      },
    });
  }

  /**
   * Returns an action type, throws if not registered
   */
  public get(id: string): ActionType {
    if (!this.has(id)) {
      throw Boom.badRequest(
        i18n.translate('xpack.actions.actionTypeRegistry.get.missingActionTypeError', {
          defaultMessage: 'Action type "{id}" is not registered.',
          values: {
            id,
          },
        })
      );
    }
    return this.actionTypes.get(id)!;
  }

  /**
   * Returns a list of registered action types [{ id, name }]
   */
  public list() {
    return Array.from(this.actionTypes).map(([actionTypeId, actionType]) => ({
      id: actionTypeId,
      name: actionType.name,
    }));
  }
}
