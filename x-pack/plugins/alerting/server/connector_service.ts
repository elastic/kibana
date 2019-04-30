/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { consoleConnector, slackConnector } from './default_connectors';

interface Connector {
  id: string;
  executor(connectorOptions: any, params: any): Promise<any>;
}

export class ConnectorService {
  private connectors: { [id: string]: Connector } = {};

  constructor() {
    this.register(consoleConnector);
    this.register(slackConnector);
  }

  public has(connectorId: string) {
    return !!this.connectors[connectorId];
  }

  public register(connector: Connector) {
    if (this.has(connector.id)) {
      throw Boom.badRequest(`Connector "${connector.id}" is already registered.`);
    }
    this.connectors[connector.id] = connector;
  }

  public async execute(connectorId: string, connectorOptions: any, params: any) {
    const connector = this.connectors[connectorId];
    if (!connector) {
      throw Boom.badRequest(`Connector "${connectorId}" is not registered.`);
    }
    return await connector.executor(connectorOptions, params);
  }
}
