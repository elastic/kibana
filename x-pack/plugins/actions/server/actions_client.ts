/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { i18n } from '@kbn/i18n';
import { SavedObjectsClient } from 'src/legacy/server/saved_objects';
import { EncryptedSavedObjectsPlugin } from '../../encrypted_saved_objects';
import { ActionTypeService } from './action_type_service';
import { SavedObjectReference } from './types';

interface Action {
  description: string;
  actionTypeId: string;
  actionTypeConfig: Record<string, any>;
}

interface FireOptions {
  id: string;
  params: Record<string, any>;
}

interface CreateOptions {
  data: Action;
  options?: {
    migrationVersion?: Record<string, string>;
    references?: SavedObjectReference[];
  };
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

interface ConstructorOptions {
  actionTypeService: ActionTypeService;
  encryptedSavedObjectsPlugin: EncryptedSavedObjectsPlugin;
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
  private encryptedSavedObjectsPlugin: EncryptedSavedObjectsPlugin;

  constructor({
    actionTypeService,
    encryptedSavedObjectsPlugin,
    savedObjectsClient,
  }: ConstructorOptions) {
    this.actionTypeService = actionTypeService;
    this.encryptedSavedObjectsPlugin = encryptedSavedObjectsPlugin;
    this.savedObjectsClient = savedObjectsClient;
  }

  /**
   * Create an action
   */
  public async create({ data, options }: CreateOptions) {
    const { actionTypeId } = data;
    if (!this.actionTypeService.has(actionTypeId)) {
      throw Boom.badRequest(
        i18n.translate('xpack.actions.actionsClient.create.missingActionTypeError', {
          defaultMessage: 'Action type "{actionTypeId}" is not registered.',
          values: {
            actionTypeId,
          },
        })
      );
    }
    this.actionTypeService.validateActionTypeConfig(actionTypeId, data.actionTypeConfig);
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
  public async find(options: FindOptions = {}) {
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
    if (!this.actionTypeService.has(actionTypeId)) {
      throw Boom.badRequest(`Action type "${actionTypeId}" is not registered.`);
    }
    this.actionTypeService.validateActionTypeConfig(actionTypeId, data.actionTypeConfig);
    const actionWithSplitActionTypeConfig = this.moveEncryptedAttributesToSecrets(data);
    return await this.savedObjectsClient.update(
      'action',
      id,
      actionWithSplitActionTypeConfig,
      options
    );
  }

  /**
   * Fire an action
   */
  public async fire({ id, params }: FireOptions) {
    const action = await this.encryptedSavedObjectsPlugin.getDecryptedAsInternalUser('action', id);
    const mergedActionTypeConfig = {
      ...action.attributes.actionTypeConfig,
      ...action.attributes.actionTypeConfigSecrets,
    };
    return await this.actionTypeService.execute({
      id: action.attributes.actionTypeId,
      actionTypeConfig: mergedActionTypeConfig,
      params,
    });
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
