/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsClient } from '@kbn/actions-plugin/server';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client.mock';
import { schema } from '@kbn/config-schema';
import { ConnectorAdapterRegistry } from '../connector_adapters/connector_adapter_registry';
import { ConnectorAdapter } from '../connector_adapters/types';
import { RuleActionTypes, RuleSystemAction } from '../types';
import { validateSystemActions } from './validate_system_actions';

describe('validateSystemActions', () => {
  const connectorAdapter: ConnectorAdapter = {
    connectorTypeId: '.test',
    ruleActionParamsSchema: schema.object({ foo: schema.string() }),
    buildActionParams: jest.fn(),
  };

  let registry: ConnectorAdapterRegistry;
  let actionsClient: jest.Mocked<ActionsClient>;

  beforeEach(() => {
    registry = new ConnectorAdapterRegistry();
    actionsClient = actionsClientMock.create();
  });

  it('should throw an error if the action is not a system action even if it is declared as one', () => {
    const systemActions: RuleSystemAction[] = [
      {
        id: '1',
        uuid: '123',
        params: { 'not-exist': 'test' },
        actionTypeId: '.test',
        type: RuleActionTypes.SYSTEM,
      },
    ];

    registry.register(connectorAdapter);

    actionsClient.isSystemAction.mockReturnValue(false);

    expect(() =>
      validateSystemActions({
        connectorAdapterRegistry: registry,
        systemActions,
        actionsClient,
      })
    ).toThrowErrorMatchingInlineSnapshot(`"Action 1 of type .test is not a system action"`);
  });

  it('should throw an error if the params are not valid', () => {
    const systemActions: RuleSystemAction[] = [
      {
        id: '1',
        uuid: '123',
        params: { 'not-exist': 'test' },
        actionTypeId: '.test',
        type: RuleActionTypes.SYSTEM,
      },
    ];

    registry.register(connectorAdapter);

    actionsClient.isSystemAction.mockReturnValue(true);

    expect(() =>
      validateSystemActions({
        connectorAdapterRegistry: registry,
        systemActions,
        actionsClient,
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Invalid system action params. System action type: .test - [foo]: expected value of type [string] but got [undefined]"`
    );
  });
});
