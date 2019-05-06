/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { SavedObjectsClient } from 'src/legacy/server/saved_objects';
import { ConnectorService } from './connector_service';

interface Action {
  description: string;
  connectorId: string;
  connectorOptions: { [key: string]: any };
}

interface EncryptedAction extends Action {
  description: string;
  connectorId: string;
  connectorOptions: { [key: string]: any };
  connectorOptionsSecrets: { [key: string]: any };
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
  private connectorService: ConnectorService;
  private encryptedSavedObjects: any;

  constructor(connectorService: ConnectorService, encryptedSavedObjects: any) {
    this.connectorService = connectorService;
    this.encryptedSavedObjects = encryptedSavedObjects;
  }

  public async create(
    savedObjectsClient: SavedObjectsClient,
    data: Action,
    { id, overwrite }: { id?: string; overwrite?: boolean } = {}
  ) {
    const { connectorId } = data;
    if (!this.connectorService.has(connectorId)) {
      throw Boom.badRequest(`Connector "${connectorId}" is not registered.`);
    }
    this.connectorService.validateConnectorOptions(connectorId, data.connectorOptions);
    const actionWithSplitConnectorOptions = this.applyEncryptedAttributes(data);
    return await savedObjectsClient.create<any>('action', actionWithSplitConnectorOptions, {
      id,
      overwrite,
    });
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
    const { connectorId } = data;
    if (!this.connectorService.has(connectorId)) {
      throw Boom.badRequest(`Connector "${connectorId}" is not registered.`);
    }
    this.connectorService.validateConnectorOptions(connectorId, data.connectorOptions);
    const actionWithSplitConnectorOptions = this.applyEncryptedAttributes(data);
    return await savedObjectsClient.update<any>(
      'action',
      id,
      actionWithSplitConnectorOptions,
      options
    );
  }

  public async fire({ id, params, savedObjectsClient }: FireActionOptions) {
    const action = await this.encryptedSavedObjects.getDecryptedAsInternalUser('action', id);
    return await this.connectorService.execute(
      action.attributes.connectorId,
      {
        ...action.attributes.connectorOptions,
        ...action.attributes.connectorOptionsSecrets,
      },
      params
    );
  }

  private applyEncryptedAttributes(action: Action): EncryptedAction {
    const unencryptedAttributes = this.connectorService.getEncryptedAttributes(action.connectorId);
    const encryptedConnectorOptions: { [key: string]: any } = {};
    const unencryptedConnectorOptions: { [key: string]: any } = {};
    for (const key of Object.keys(action.connectorOptions)) {
      if (unencryptedAttributes.includes(key)) {
        unencryptedConnectorOptions[key] = action.connectorOptions[key];
        continue;
      }
      encryptedConnectorOptions[key] = action.connectorOptions[key];
    }
    return {
      ...action,
      // Important these overwrite attributes in data for encryption purposes
      connectorOptions: unencryptedConnectorOptions,
      connectorOptionsSecrets: encryptedConnectorOptions,
    };
  }
}
