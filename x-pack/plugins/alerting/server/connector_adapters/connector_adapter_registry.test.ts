/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorAdapterRegistry } from './connector_adapter_registry';
import type { ConnectorAdapter } from './types';

describe('ConnectorAdapterRegistry', () => {
  const connectorAdapter: ConnectorAdapter = { connectorTypeId: '.test' };
  let registry: ConnectorAdapterRegistry;

  beforeEach(() => {
    registry = new ConnectorAdapterRegistry();
  });

  describe('register', () => {
    it('registers a connector adapter correctly', () => {
      registry.register(connectorAdapter);
      expect(registry.get('.test')).toEqual(connectorAdapter);
    });

    it('throws an error if the connector adapter exists', () => {
      registry.register(connectorAdapter);

      expect(() => registry.register(connectorAdapter)).toThrowErrorMatchingInlineSnapshot(
        `".test is already registered to the ConnectorAdapterRegistry"`
      );
    });
  });

  describe('get', () => {
    it('gets a connector adapter correctly', () => {
      registry.register(connectorAdapter);
      expect(registry.get('.test')).toEqual(connectorAdapter);
    });

    it('throws an error if the connector adapter does not exists', () => {
      expect(() => registry.get('.not-exists')).toThrowErrorMatchingInlineSnapshot(
        `"Connector adapter \\".not-exists\\" is not registered."`
      );
    });
  });
});
