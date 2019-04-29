/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { SavedObjectsClient } from 'src/legacy/server/saved_objects';
import { consoleConnector } from './default_connectors';

type ConnectorExecutor = (connectorOptions: any, params: any) => Promise<any>;

interface Action {
  id: string;
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

export class AlertingService {
  private connectors: {
    [id: string]: ConnectorExecutor;
  } = {};

  constructor() {
    // Register default connectors
    this.registerConnector('console', consoleConnector);
  }

  public registerConnector(connectorId: string, executor: ConnectorExecutor) {
    if (this.hasConnector(connectorId)) {
      throw Boom.badRequest(`Connector "${connectorId}" is already registered`);
    }
    this.connectors[connectorId] = executor;
  }

  public hasConnector(connectorId: string) {
    return !!this.connectors[connectorId];
  }

  public async createAction(savedObjectsClient: SavedObjectsClient, { id, ...data }: Action) {
    const { connectorId } = data;
    if (!this.hasConnector(connectorId)) {
      throw Boom.badRequest(`Connector "${connectorId}" is not registered`);
    }
    return await savedObjectsClient.create<any>('action', data, { id });
  }

  public async fireAction({ id, params, savedObjectsClient }: FireActionOptions) {
    const action = await savedObjectsClient.get('action', id);
    const executor = this.connectors[action.attributes.connectorId];
    if (!executor) {
      throw Boom.badRequest(`Connector "${action.attributes.connectorId}" is not registered`);
    }
    const connectorOptions = Object.assign(
      {},
      action.attributes.connectorOptions,
      action.attributes.connectorOptionsSecrets
    );
    return await executor(connectorOptions, params);
  }
}
