/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { SavedObjectsClient } from 'src/legacy/server/saved_objects';
import { ActionTypeService } from './action_type_service';

interface Action {
  description: string;
  actionTypeId: string;
  actionTypeConfig: { [key: string]: any };
}

interface EncryptedAction extends Action {
  description: string;
  actionTypeId: string;
  actionTypeConfig: { [key: string]: any };
  actionTypeConfigSecrets: { [key: string]: any };
}

interface FireActionOptions {
  id: string;
  params: { [key: string]: any };
  savedObjectsClient: SavedObjectsClient;
}

export interface SavedObjectReference {
  name: string;
  type: string;
  id: string;
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

  public async create(savedObjectsClient: SavedObjectsClient, data: Action) {
    const { actionTypeId } = data;
    if (!this.actionTypeService.has(actionTypeId)) {
      throw Boom.badRequest(`Action type "${actionTypeId}" is not registered.`);
    }
    this.actionTypeService.validateActionTypeConfig(actionTypeId, data.actionTypeConfig);
    const actionWithSplitActionTypeConfig = this.applyEncryptedAttributes(data);
    return await savedObjectsClient.create<any>('action', actionWithSplitActionTypeConfig);
  }

  public async get(savedObjectsClient: SavedObjectsClient, id: string) {
    return await savedObjectsClient.get('action', id);
  }

  public async find(savedObjectsClient: SavedObjectsClient, options: FindOptions) {
    return await savedObjectsClient.find({
      ...options,
      type: 'action',
    });
  }

  public async delete(savedObjectsClient: SavedObjectsClient, id: string) {
    return await savedObjectsClient.delete('action', id);
  }

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
    const actionWithSplitActionTypeConfig = this.applyEncryptedAttributes(data);
    return await savedObjectsClient.update<any>(
      'action',
      id,
      actionWithSplitActionTypeConfig,
      options
    );
  }

  public async fire({ id, params, savedObjectsClient }: FireActionOptions) {
    const action = await this.encryptedSavedObjects.getDecryptedAsInternalUser('action', id);
    return await this.actionTypeService.execute(
      action.attributes.actionTypeId,
      {
        ...action.attributes.actionTypeConfig,
        ...action.attributes.actionTypeConfigSecrets,
      },
      params
    );
  }

  private applyEncryptedAttributes(action: Action): EncryptedAction {
    const unencryptedAttributes = this.actionTypeService.getUnencryptedAttributes(
      action.actionTypeId
    );
    const encryptedActionTypeConfig: { [key: string]: any } = {};
    const unencryptedActionTypeConfig: { [key: string]: any } = {};
    for (const key of Object.keys(action.actionTypeConfig)) {
      if (unencryptedAttributes.includes(key)) {
        unencryptedActionTypeConfig[key] = action.actionTypeConfig[key];
        continue;
      }
      encryptedActionTypeConfig[key] = action.actionTypeConfig[key];
    }
    return {
      ...action,
      // Important these overwrite attributes in data for encryption purposes
      actionTypeConfig: unencryptedActionTypeConfig,
      actionTypeConfigSecrets: encryptedActionTypeConfig,
    };
  }
}
