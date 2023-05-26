/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';
import { registerConnectorTypes } from '..';
import { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public/types';
import { registrationServicesMock } from '../../mocks';

const CONNECTOR_TYPE_ID = '.d3security';
let connectorTypeModel: ConnectorTypeModel;
beforeAll(() => {
  const connectorTypeRegistry = new TypeRegistry<ConnectorTypeModel>();
  registerConnectorTypes({ connectorTypeRegistry, services: registrationServicesMock });
  const getResult = connectorTypeRegistry.get(CONNECTOR_TYPE_ID);
  if (getResult !== null) {
    connectorTypeModel = getResult;
  }
});

describe('actionTypeRegistry.get() works', () => {
  test('action type static data is as expected', () => {
    expect(connectorTypeModel.id).toEqual(CONNECTOR_TYPE_ID);
  });
});

describe('d3security action params validation', () => {
  test('action params validation succeeds when action params is valid', async () => {
    const actionParams = {
      body: 'message {test}',
      severity: 'test severity',
      eventType: 'test type',
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: { body: [], severity: [], eventType: [] },
    });
  });

  test('params validation fails when body is not valid', async () => {
    const actionParams = {
      body: '',
      severity: '',
      eventType: '',
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        body: ['Body is required.'],
        severity: [],
        eventType: [],
      },
    });
  });
});
