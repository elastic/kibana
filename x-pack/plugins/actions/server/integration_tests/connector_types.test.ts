/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import { ActionTypeRegistry } from '../action_type_registry';
import { setupTestServers } from './lib';
import { connectorTypes } from './mocks/connector_types';

jest.mock('../action_type_registry', () => {
  const actual = jest.requireActual('../action_type_registry');
  return {
    ...actual,
    ActionTypeRegistry: jest.fn().mockImplementation((opts) => {
      return new actual.ActionTypeRegistry(opts);
    }),
  };
});

describe('Connector type config checks', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let actionTypeRegistry: ActionTypeRegistry;

  beforeAll(async () => {
    const setupResult = await setupTestServers();
    esServer = setupResult.esServer;
    kibanaServer = setupResult.kibanaServer;

    const mockedActionTypeRegistry = jest.requireMock('../action_type_registry');
    expect(mockedActionTypeRegistry.ActionTypeRegistry).toHaveBeenCalledTimes(1);
    actionTypeRegistry = mockedActionTypeRegistry.ActionTypeRegistry.mock.results[0].value;
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  test('ensure connector types list up to date', () => {
    expect(connectorTypes).toEqual(actionTypeRegistry.getAllTypes());
  });

  for (const connectorTypeId of connectorTypes) {
    test(`detect connector type changes for: ${connectorTypeId}`, async () => {
      const connectorType = actionTypeRegistry.get(connectorTypeId);

      expect(connectorType?.validate.config.schema.getSchema!().describe()).toMatchSnapshot();
      expect(connectorType.validate.secrets.schema.getSchema!().describe()).toMatchSnapshot();
      expect(connectorType.validate.params.schema.getSchema!().describe()).toMatchSnapshot();
    });
  }
});
