/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, SavedObjectAttributes } from 'src/core/server';
import { ActionTypeRegistry } from './action_type_registry';
import { SavedObjectReference } from './types';
import { validateActionTypeConfig } from './lib';

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

interface FireOptions {
  id: string;
  params: Record<string, any>;
  namespace?: string;
  basePath: string;
}

interface ConstructorOptions {
  actionTypeRegistry: ActionTypeRegistry;
  savedObjectsClient: SavedObjectsClientContract;
  fireFn(fireOptions: FireOptions): Promise<any>;
}

interface UpdateOptions {
  id: string;
  data: {
    description: string;
    actionTypeConfig: SavedObjectAttributes;
  };
  options: { version?: string; references?: SavedObjectReference[] };
}

export class ActionsClient {
  private readonly savedObjectsClient: SavedObjectsClientContract;
  private readonly actionTypeRegistry: ActionTypeRegistry;
  private readonly fireFn: (fireOptions: FireOptions) => Promise<any>;

  constructor({ actionTypeRegistry, savedObjectsClient, fireFn }: ConstructorOptions) {
    this.actionTypeRegistry = actionTypeRegistry;
    this.savedObjectsClient = savedObjectsClient;
    this.fireFn = fireFn;
  }

  /**
   * Create an action
   */
  public async create({ data, options }: CreateOptions) {
    const { actionTypeId } = data;
    const actionType = this.actionTypeRegistry.get(actionTypeId);
    const validatedActionTypeConfig = validateActionTypeConfig(actionType, data.actionTypeConfig);
    const actionWithSplitActionTypeConfig = this.moveEncryptedAttributesToSecrets(
      actionType.unencryptedAttributes,
      {
        ...data,
        actionTypeConfig: validatedActionTypeConfig,
      }
    );
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
   * Fire action
   */
  public async fire({ id, params }: { id: string; params: Record<string, any> }) {
    return await this.fireFn({ id, params, namespace: '', basePath: '' });
  }

  /**
   * Update action
   */
  public async update({ id, data, options = {} }: UpdateOptions) {
    const existingObject = await this.savedObjectsClient.get('action', id);
    const { actionTypeId } = existingObject.attributes;
    const actionType = this.actionTypeRegistry.get(actionTypeId);

    const validatedActionTypeConfig = validateActionTypeConfig(actionType, data.actionTypeConfig);
    data = this.moveEncryptedAttributesToSecrets(actionType.unencryptedAttributes, {
      ...data,
      actionTypeConfig: validatedActionTypeConfig,
    });
    return await this.savedObjectsClient.update('action', id, { ...data, actionTypeId }, options);
  }

  /**
   * Set actionTypeConfigSecrets values on a given action
   */
  private moveEncryptedAttributesToSecrets(
    unencryptedAttributes: string[] = [],
    action: Action | UpdateOptions['data']
  ) {
    const actionTypeConfig: Record<string, any> = {};
    const actionTypeConfigSecrets = { ...action.actionTypeConfig };
    for (const attributeKey of unencryptedAttributes) {
      actionTypeConfig[attributeKey] = actionTypeConfigSecrets[attributeKey];
      delete actionTypeConfigSecrets[attributeKey];
    }

    return {
      ...action,
      // Important these overwrite attributes in data for encryption purposes
      actionTypeConfig,
      actionTypeConfigSecrets,
    };
  }
}
