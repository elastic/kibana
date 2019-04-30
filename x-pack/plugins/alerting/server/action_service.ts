/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { SavedObjectsClient } from 'src/legacy/server/saved_objects';
import { ConnectorService } from './connector_service';

interface Action {
  id: string;
  description: string;
  connectorId: string;
  connectorOptions: { [key: string]: any };
}

interface FireActionOptions {
  id: string;
  params: { [key: string]: any };
  savedObjectsClient: SavedObjectsClient;
}

export class ActionService {
  private connectorService: ConnectorService;

  constructor(connectorService: ConnectorService) {
    this.connectorService = connectorService;
  }

  public async create(savedObjectsClient: SavedObjectsClient, { id, ...data }: Action) {
    const { connectorId } = data;
    if (!this.connectorService.has(connectorId)) {
      throw Boom.badRequest(`Connector "${connectorId}" is not registered.`);
    }
    this.connectorService.validateConnectorOptions(connectorId, data.connectorOptions);
    return await savedObjectsClient.create<any>('action', data, { id });
  }

  public async get(savedObjectsClient: SavedObjectsClient, id: string) {
    return await savedObjectsClient.get('action', id);
  }

  public async fire({ id, params, savedObjectsClient }: FireActionOptions) {
    const action = await this.get(savedObjectsClient, id);
    return await this.connectorService.execute(
      action.attributes.connectorId,
      action.attributes.connectorOptions,
      params
    );
  }
}
