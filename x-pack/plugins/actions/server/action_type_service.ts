/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { i18n } from '@kbn/i18n';

interface ExecutorOptions {
  actionTypeConfig: Record<string, any>;
  params: Record<string, any>;
}

interface ActionType {
  id: string;
  name: string;
  unencryptedAttributes?: string[];
  validate?: {
    params?: Record<string, any>;
    actionTypeConfig?: Record<string, any>;
  };
  executor({ actionTypeConfig, params }: ExecutorOptions): Promise<any>;
}

interface ExecuteOptions {
  id: string;
  actionTypeConfig: Record<string, any>;
  params: Record<string, any>;
}

export class ActionTypeService {
  private actionTypes: Record<string, ActionType> = {};

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

  /**
   * Throws an error if params are invalid for given action type
   */
  public validateParams(id: string, params: Record<string, any>) {
    const actionType = this.get(id);
    const validator = actionType.validate && actionType.validate.params;
    if (validator) {
      const { error } = validator.validate(params);
      if (error) {
        throw error;
      }
    }
  }

  /**
   * Throws an error if actionTypeConfig is invalid for given action type
   */
  public validateActionTypeConfig(id: string, actionTypeConfig: Record<string, any>) {
    const actionType = this.get(id);
    const validator = actionType.validate && actionType.validate.actionTypeConfig;
    if (validator) {
      const { error } = validator.validate(actionTypeConfig);
      if (error) {
        throw error;
      }
    }
  }

  /**
   * Executes an action type based on given parameters
   */
  public async execute({ id, actionTypeConfig, params }: ExecuteOptions) {
    const actionType = this.get(id);
    this.validateActionTypeConfig(id, actionTypeConfig);
    this.validateParams(id, params);
    return await actionType.executor({ actionTypeConfig, params });
  }
}
