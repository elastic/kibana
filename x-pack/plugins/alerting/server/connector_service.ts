/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

interface Connector {
  id: string;
  name: string;
  unencryptedAttributes?: string[];
  validate?: {
    params?: any;
    connectorOptions?: any;
  };
  executor(connectorOptions: any, params: any): Promise<any>;
}

export class ConnectorService {
  private connectors: { [id: string]: Connector } = {};

  public has(id: string) {
    return !!this.connectors[id];
  }

  public register(connector: Connector) {
    if (this.has(connector.id)) {
      throw Boom.badRequest(`Connector "${connector.id}" is already registered.`);
    }
    this.connectors[connector.id] = connector;
  }

  public get(id: string) {
    const connector = this.connectors[id];
    if (!connector) {
      throw Boom.badRequest(`Connector "${id}" is not registered.`);
    }
    return connector;
  }

  public getEncryptedAttributes(id: string) {
    const connector = this.get(id);
    return connector.unencryptedAttributes || [];
  }

  public list() {
    const connectorIds = Object.keys(this.connectors);
    return connectorIds.map(id => ({
      id,
      name: this.connectors[id].name,
    }));
  }

  public validateParams(id: string, params: any) {
    const connector = this.get(id);
    const validator = connector.validate && connector.validate.params;
    if (validator) {
      const { error } = validator.validate(params);
      if (error) {
        throw error;
      }
    }
  }

  public validateConnectorOptions(id: string, connectorOptions: any) {
    const connector = this.get(id);
    const validator = connector.validate && connector.validate.connectorOptions;
    if (validator) {
      const { error } = validator.validate(connectorOptions);
      if (error) {
        throw error;
      }
    }
  }

  public async execute(id: string, connectorOptions: any, params: any) {
    const connector = this.get(id);
    this.validateConnectorOptions(id, connectorOptions);
    this.validateParams(id, params);
    return await connector.executor(connectorOptions, params);
  }
}
