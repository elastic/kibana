/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ConnectorAdapterRegistry } from './connector_adapter_registry';
import { getSystemActionKibanaPrivileges } from './get_system_action_kibana_privileges';
import type { ConnectorAdapter } from './types';

describe('getSystemActionKibanaPrivileges', () => {
  const connectorAdapter: ConnectorAdapter = {
    connectorTypeId: '.test',
    ruleActionParamsSchema: schema.object({ foo: schema.string() }),
    buildActionParams: jest.fn(),
    getKibanaPrivileges: (args) => [`my-priv:${args.consumer}`],
  };

  const systemActions = [
    { id: 'my-id', actionTypeId: '.test', params: {} },
    { id: 'my-id-2', actionTypeId: '.test-2', params: {} },
  ];

  let registry: ConnectorAdapterRegistry;

  beforeEach(() => {
    registry = new ConnectorAdapterRegistry();
    registry.register(connectorAdapter);

    registry.register({
      ...connectorAdapter,
      connectorTypeId: '.test-2',
      getKibanaPrivileges: (args) => [`my-priv-2:${args.consumer}`],
    });

    registry.register({
      ...connectorAdapter,
      connectorTypeId: '.no-priv',
    });
  });

  it('should return an empty array if systemActions are empty', () => {
    const privileges = getSystemActionKibanaPrivileges({
      connectorAdapterRegistry: registry,
      systemActions: [],
      rule: { consumer: 'stackAlerts' },
    });

    expect(privileges).toEqual([]);
  });

  it('should return an empty array if systemActions are not defined', () => {
    const privileges = getSystemActionKibanaPrivileges({
      connectorAdapterRegistry: registry,
      rule: { consumer: 'stackAlerts' },
    });

    expect(privileges).toEqual([]);
  });

  it('should return the privileges correctly', () => {
    const privileges = getSystemActionKibanaPrivileges({
      connectorAdapterRegistry: registry,
      systemActions,
      rule: { consumer: 'stackAlerts' },
    });

    expect(privileges).toEqual(['my-priv:stackAlerts', 'my-priv-2:stackAlerts']);
  });

  it('should return the privileges correctly with system actions without connector adapter', () => {
    const privileges = getSystemActionKibanaPrivileges({
      connectorAdapterRegistry: registry,
      systemActions: [...systemActions, { id: 'my-id-2', actionTypeId: '.not-valid', params: {} }],
      rule: { consumer: 'stackAlerts' },
    });

    expect(privileges).toEqual(['my-priv:stackAlerts', 'my-priv-2:stackAlerts']);
  });

  it('should return the privileges correctly with system actions without getKibanaPrivileges defined', () => {
    const privileges = getSystemActionKibanaPrivileges({
      connectorAdapterRegistry: registry,
      systemActions: [...systemActions, { id: 'my-id-2', actionTypeId: '.no-priv', params: {} }],
      rule: { consumer: 'stackAlerts' },
    });

    expect(privileges).toEqual(['my-priv:stackAlerts', 'my-priv-2:stackAlerts']);
  });

  it('should not return duplicated privileges', () => {
    const privileges = getSystemActionKibanaPrivileges({
      connectorAdapterRegistry: registry,
      systemActions: [systemActions[0], systemActions[0]],
      rule: { consumer: 'stackAlerts' },
    });

    expect(privileges).toEqual(['my-priv:stackAlerts']);
  });
});
