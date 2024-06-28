/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';

import { ConnectorAdapter, ConnectorAdapterParams } from './types';

export class ConnectorAdapterRegistry {
  private readonly connectorAdapters: Map<string, ConnectorAdapter> = new Map();

  public has(connectorTypeId: string): boolean {
    return this.connectorAdapters.has(connectorTypeId);
  }

  public register<
    RuleActionParams extends ConnectorAdapterParams = ConnectorAdapterParams,
    ConnectorParams extends ConnectorAdapterParams = ConnectorAdapterParams
  >(connectorAdapter: ConnectorAdapter<RuleActionParams, ConnectorParams>) {
    if (this.has(connectorAdapter.connectorTypeId)) {
      throw new Error(
        `${connectorAdapter.connectorTypeId} is already registered to the ConnectorAdapterRegistry`
      );
    }

    this.connectorAdapters.set(
      connectorAdapter.connectorTypeId,
      connectorAdapter as unknown as ConnectorAdapter
    );
  }

  public get(connectorTypeId: string): ConnectorAdapter {
    if (!this.connectorAdapters.has(connectorTypeId)) {
      throw Boom.badRequest(
        i18n.translate(
          'xpack.alerting.connectorAdapterRegistry.get.missingConnectorAdapterErrorMessage',
          {
            defaultMessage: 'Connector adapter "{connectorTypeId}" is not registered.',
            values: {
              connectorTypeId,
            },
          }
        )
      );
    }

    return this.connectorAdapters.get(connectorTypeId)!;
  }
}
