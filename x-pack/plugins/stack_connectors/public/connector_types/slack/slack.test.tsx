/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';
import { registerConnectorTypes } from '..';
import type { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public/types';
import { registrationServicesMock } from '../../mocks';

const CONNECTOR_TYPE_ID = '.slack';
let connectorTypeModel: ConnectorTypeModel;

beforeAll(async () => {
  const connectorTypeRegistry = new TypeRegistry<ConnectorTypeModel>();
  registerConnectorTypes({ connectorTypeRegistry, services: registrationServicesMock });
  const getResult = connectorTypeRegistry.get(CONNECTOR_TYPE_ID);
  if (getResult !== null) {
    connectorTypeModel = getResult;
  }
});

describe('connectorTypeRegistry.get() works', () => {
  test('connector type static data is as expected', () => {
    expect(connectorTypeModel.id).toEqual(CONNECTOR_TYPE_ID);
    expect(connectorTypeModel.iconClass).toEqual('logoSlack');
  });
});

describe('slack action params validation', () => {
  test('should succeed when action params include valid message', async () => {
    const actionParams = {
      message: 'message {test}',
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        message: [],
        'subActionParams.channels': [],
      },
    });
  });

  test('params validation fails when message is not valid', async () => {
    const actionParams = {
      message: '',
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        message: ['Message is required.'],
        'subActionParams.channels': [],
      },
    });
  });

  test('should succeed when action params include valid message and channels list', async () => {
    const actionParams = {
      subAction: 'postMessage',
      subActionParams: { channels: ['general'], text: 'some text' },
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        message: [],
        'subActionParams.channels': [],
      },
    });
  });

  test('should fail when action params do not includes any channels', async () => {
    const actionParams = {
      subAction: 'postMessage',
      subActionParams: { channels: [], text: 'some text' },
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        message: [],
        'subActionParams.channels': ['At least one selected channel is required.'],
      },
    });
  });

  test('should fail when channels field is missing in action params', async () => {
    const actionParams = {
      subAction: 'postMessage',
      subActionParams: { text: 'some text' },
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        message: [],
        'subActionParams.channels': ['At least one selected channel is required.'],
      },
    });
  });

  test('should fail when field text doesnot exist', async () => {
    const actionParams = {
      subAction: 'postMessage',
      subActionParams: { channels: ['general'] },
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        message: ['Message is required.'],
        'subActionParams.channels': [],
      },
    });
  });

  test('should fail when text is empty string', async () => {
    const actionParams = {
      subAction: 'postMessage',
      subActionParams: { channels: ['general'], text: '' },
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        message: ['Message is required.'],
        'subActionParams.channels': [],
      },
    });
  });
});
