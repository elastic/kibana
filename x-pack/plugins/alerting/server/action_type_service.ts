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
  private actionTypes: { [id: string]: ActionType } = {};

  public has(id: string) {
    return !!this.actionTypes[id];
  }

  public register(actionType: ActionType) {
    if (this.has(actionType.id)) {
      throw Boom.badRequest(`Action type "${actionType.id}" is already registered.`);
    }
    this.actionTypes[actionType.id] = actionType;
  }

  public get(id: string) {
    const actionType = this.actionTypes[id];
    if (!actionType) {
      throw Boom.badRequest(`Action type "${id}" is not registered.`);
    }
    return actionType;
  }

  public getUnencryptedAttributes(id: string) {
    const actionType = this.get(id);
    return actionType.unencryptedAttributes || [];
  }

  public list() {
    const actionTypeIds = Object.keys(this.actionTypes);
    return actionTypeIds.map(actionTypeId => ({
      id: actionTypeId,
      name: this.actionTypes[actionTypeId].name,
    }));
  }

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

  public async execute(id: string, actionTypeConfig: any, params: any) {
    const actionType = this.get(id);
    this.validateActionTypeConfig(id, actionTypeConfig);
    this.validateParams(id, params);
    return await actionType.executor({ actionTypeConfig, params });
  }
}
