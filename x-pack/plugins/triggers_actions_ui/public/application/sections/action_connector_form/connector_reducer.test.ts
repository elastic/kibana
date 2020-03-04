/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { connectorReducer } from './connector_reducer';
import { ActionConnector } from '../../../types';

describe('connector reducer', () => {
  let initialConnector: ActionConnector;
  beforeAll(() => {
    initialConnector = {
      secrets: {},
      id: 'test',
      actionTypeId: 'test-action-type-id',
      name: 'action-connector',
      referencedByCount: 0,
      config: {},
    };
  });

  test('if property name was changed', () => {
    const updatedConnector = connectorReducer(
      { connector: initialConnector },
      {
        command: { type: 'setProperty' },
        payload: {
          key: 'name',
          value: 'new name',
        },
      }
    );
    expect(updatedConnector.connector.name).toBe('new name');
  });

  test('if config property was added and updated', () => {
    const updatedConnector = connectorReducer(
      { connector: initialConnector },
      {
        command: { type: 'setConfigProperty' },
        payload: {
          key: 'testConfig',
          value: 'new test config property',
        },
      }
    );
    expect(updatedConnector.connector.config.testConfig).toBe('new test config property');

    const updatedConnectorUpdatedProperty = connectorReducer(
      { connector: updatedConnector.connector },
      {
        command: { type: 'setConfigProperty' },
        payload: {
          key: 'testConfig',
          value: 'test config property updated',
        },
      }
    );
    expect(updatedConnectorUpdatedProperty.connector.config.testConfig).toBe(
      'test config property updated'
    );
  });

  test('if secrets property was added', () => {
    const updatedConnector = connectorReducer(
      { connector: initialConnector },
      {
        command: { type: 'setSecretsProperty' },
        payload: {
          key: 'testSecret',
          value: 'new test secret property',
        },
      }
    );
    expect(updatedConnector.connector.secrets.testSecret).toBe('new test secret property');

    const updatedConnectorUpdatedProperty = connectorReducer(
      { connector: updatedConnector.connector },
      {
        command: { type: 'setSecretsProperty' },
        payload: {
          key: 'testSecret',
          value: 'test secret property updated',
        },
      }
    );
    expect(updatedConnectorUpdatedProperty.connector.secrets.testSecret).toBe(
      'test secret property updated'
    );
  });
});
