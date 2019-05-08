/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { SavedObjectsClient } from 'src/legacy/server/saved_objects';
import { ActionTypeService } from './action_type_service';
import { SavedObjectReference } from './types';

interface Action {
  description: string;
  actionTypeId: string;
  actionTypeConfig: Record<string, any>;
}

interface EncryptedAction extends Action {
  actionTypeConfigSecrets: Record<string, any>;
}

interface FireActionOptions {
  id: string;
  params: Record<string, any>;
  savedObjectsClient: SavedObjectsClient;
}

interface FindOptions {
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
}

export class ActionService {
  private actionTypeService: ActionTypeService;
  private encryptedSavedObjects: any;

  constructor(actionTypeService: ActionTypeService, encryptedSavedObjects: any) {
    this.actionTypeService = actionTypeService;
    this.encryptedSavedObjects = encryptedSavedObjects;
  }

  /**
   * Create an action
   */
  public async create(savedObjectsClient: SavedObjectsClient, data: Action) {
    const { actionTypeId } = data;
    if (!this.actionTypeService.has(actionTypeId)) {
      throw Boom.badRequest(`Action type "${actionTypeId}" is not registered.`);
    }
    this.actionTypeService.validateActionTypeConfig(actionTypeId, data.actionTypeConfig);
    const actionWithSplitActionTypeConfig = this.moveEncryptedAttributesToSecrets(data);
    return await savedObjectsClient.create<any>('action', actionWithSplitActionTypeConfig);
  }

  /**
   * Get an action
   */
  public async get(savedObjectsClient: SavedObjectsClient, id: string) {
    return await savedObjectsClient.get('action', id);
  }

  /**
   * Find actions
   */
  public async find(savedObjectsClient: SavedObjectsClient, options: FindOptions) {
    return await savedObjectsClient.find({
      ...options,
      type: 'action',
    });
  }

  /**
   * Delete action
   */
  public async delete(savedObjectsClient: SavedObjectsClient, id: string) {
    return await savedObjectsClient.delete('action', id);
  }

  /**
   * Update action
   */
  public async update(
    savedObjectsClient: SavedObjectsClient,
    id: string,
    data: Action,
    options: { version?: string; references?: SavedObjectReference[] }
  ) {
    const { actionTypeId } = data;
    if (!this.actionTypeService.has(actionTypeId)) {
      throw Boom.badRequest(`Action type "${actionTypeId}" is not registered.`);
    }
    this.actionTypeService.validateActionTypeConfig(actionTypeId, data.actionTypeConfig);
    const actionWithSplitActionTypeConfig = this.moveEncryptedAttributesToSecrets(data);
    return await savedObjectsClient.update<any>(
      'action',
      id,
      actionWithSplitActionTypeConfig,
      options
    );
  }

  /**
   * Fire an action
   */
  public async fire({ id, params, savedObjectsClient }: FireActionOptions) {
    const action = await this.encryptedSavedObjects.getDecryptedAsInternalUser('action', id);
    const mergedActionTypeConfig = {
      ...action.attributes.actionTypeConfig,
      ...action.attributes.actionTypeConfigSecrets,
    };
    return await this.actionTypeService.execute(
      action.attributes.actionTypeId,
      mergedActionTypeConfig,
      params
    );
  }

  /**
   * Set actionTypeConfigSecrets values on a given action
   */
  private moveEncryptedAttributesToSecrets(action: Action): EncryptedAction {
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
