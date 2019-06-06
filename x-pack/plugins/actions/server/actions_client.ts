/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, SavedObjectAttributes } from 'src/legacy/server/saved_objects';
import { ActionTypeRegistry } from './action_type_registry';
import { SavedObjectReference } from './types';
import { throwIfActionTypeConfigInvalid } from './throw_if_action_type_config_invalid';

interface Action extends SavedObjectAttributes {
  description: string;
  actionTypeId: string;
  actionTypeConfig: SavedObjectAttributes;
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
  actionTypeRegistry: ActionTypeRegistry;
  savedObjectsClient: SavedObjectsClientContract;
}

interface UpdateOptions {
  id: string;
  data: Action;
  options: { version?: string; references?: SavedObjectReference[] };
}

export class ActionsClient {
  private savedObjectsClient: SavedObjectsClientContract;
  private actionTypeRegistry: ActionTypeRegistry;

  constructor({ actionTypeRegistry, savedObjectsClient }: ConstructorOptions) {
    this.actionTypeRegistry = actionTypeRegistry;
    this.savedObjectsClient = savedObjectsClient;
  }

  /**
   * Create an action
   */
  public async create({ data, options }: CreateOptions) {
    const { actionTypeId } = data;
    const actionType = this.actionTypeRegistry.get(actionTypeId);
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
    const actionType = this.actionTypeRegistry.get(actionTypeId);
    if (data.actionTypeConfig) {
      throwIfActionTypeConfigInvalid(actionType, data.actionTypeConfig);
      data = this.moveEncryptedAttributesToSecrets(data);
    }
    return await this.savedObjectsClient.update('action', id, data, options);
  }

  /**
   * Set actionTypeConfigSecrets values on a given action
   */
  private moveEncryptedAttributesToSecrets(action: Action) {
    const unencryptedAttributes = this.actionTypeRegistry.getUnencryptedAttributes(
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
