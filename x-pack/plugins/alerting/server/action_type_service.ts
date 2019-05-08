/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

interface ExecutorOptions {
  actionTypeConfig: any;
  params: any;
}

interface ActionType {
  id: string;
  name: string;
  unencryptedAttributes?: string[];
  validate?: {
    params?: any;
    actionTypeConfig?: any;
  };
  executor({ actionTypeConfig, params }: ExecutorOptions): Promise<any>;
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
      throw Boom.badRequest(`Action type "${actionType.id}" is already registered.`);
    }
    this.actionTypes[actionType.id] = actionType;
  }

  /**
   * Returns an action type, throws if not registered
   */
  public get(id: string) {
    if (!this.actionTypes[id]) {
      throw Boom.badRequest(`Action type "${id}" is not registered.`);
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
  public validateParams(id: string, params: any) {
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
  public validateActionTypeConfig(id: string, actionTypeConfig: any) {
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
  public async execute(id: string, actionTypeConfig: any, params: any) {
    const actionType = this.get(id);
    this.validateActionTypeConfig(id, actionTypeConfig);
    this.validateParams(id, params);
    return await actionType.executor({ actionTypeConfig, params });
  }
}
