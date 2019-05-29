/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClient } from 'src/legacy/server/saved_objects';
import { ActionTypeService } from './action_type_service';
import { SavedObjectReference } from './types';
import { throwIfActionTypeConfigInvalid } from './throw_if_action_type_config_invalid';

interface Action {
  description: string;
  actionTypeId: string;
  actionTypeConfig: Record<string, any>;
}

interface CreateOptions {
  data: Action;
  options?: {
    migrationVersion?: Record<string, string>;
    references?: SavedObjectReference[];
  };
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

interface ConstructorOptions {
  actionTypeService: ActionTypeService;
  savedObjectsClient: SavedObjectsClient;
}

interface UpdateOptions {
  id: string;
  data: Action;
  options: { version?: string; references?: SavedObjectReference[] };
}

export class ActionsClient {
  private savedObjectsClient: SavedObjectsClient;
  private actionTypeService: ActionTypeService;

  constructor({ actionTypeService, savedObjectsClient }: ConstructorOptions) {
    this.actionTypeService = actionTypeService;
    this.savedObjectsClient = savedObjectsClient;
  }

  /**
   * Create an action
   */
  public async create({ data, options }: CreateOptions) {
    const { actionTypeId } = data;
    const actionType = this.actionTypeService.get(actionTypeId);
    throwIfActionTypeConfigInvalid(actionType, data.actionTypeConfig);
    const actionWithSplitActionTypeConfig = this.moveEncryptedAttributesToSecrets(data);
    return await this.savedObjectsClient.create('action', actionWithSplitActionTypeConfig, options);
  }

  /**
   * Get an action
   */
  public async get({ id }: { id: string }) {
    return await this.savedObjectsClient.get('action', id);
  }

  /**
   * Find actions
   */
  public async find({ options = {} }: FindOptions) {
    return await this.savedObjectsClient.find({
      ...options,
      type: 'action',
    });
  }

  /**
   * Delete action
   */
  public async delete({ id }: { id: string }) {
    return await this.savedObjectsClient.delete('action', id);
  }

  /**
   * Update action
   */
  public async update({ id, data, options = {} }: UpdateOptions) {
    const { actionTypeId } = data;
    // Throws an error if action type is invalid
    const actionType = this.actionTypeService.get(actionTypeId);
    if (data.actionTypeConfig) {
      throwIfActionTypeConfigInvalid(actionType, data.actionTypeConfig);
      data = this.moveEncryptedAttributesToSecrets(data);
    }
    return await this.savedObjectsClient.update<any>('action', id, data, options);
  }

  /**
   * Set actionTypeConfigSecrets values on a given action
   */
  private moveEncryptedAttributesToSecrets(action: Action) {
    const unencryptedAttributes = this.actionTypeService.getUnencryptedAttributes(
      action.actionTypeId
    );
    const config = { ...action.actionTypeConfig };
    const configSecrets: Record<string, any> = {};
    for (const key of Object.keys(config)) {
      if (unencryptedAttributes.includes(key)) {
        continue;
      }
      configSecrets[key] = config[key];
      delete config[key];
    }
    return {
      ...action,
      // Important these overwrite attributes in data for encryption purposes
      actionTypeConfig: config,
      actionTypeConfigSecrets: configSecrets,
    };
  }
}
