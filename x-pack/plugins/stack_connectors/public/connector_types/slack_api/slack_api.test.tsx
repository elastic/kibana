/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';
import type { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public/types';
import { registerConnectorTypes } from '..';
import { registrationServicesMock } from '../../mocks';
import { SLACK_API_CONNECTOR_ID } from '../../../common/slack_api/constants';

let connectorTypeModel: ConnectorTypeModel;

beforeAll(async () => {
  const connectorTypeRegistry = new TypeRegistry<ConnectorTypeModel>();
  registerConnectorTypes({ connectorTypeRegistry, services: registrationServicesMock });
  const getResult = connectorTypeRegistry.get(SLACK_API_CONNECTOR_ID);
  if (getResult !== null) {
    connectorTypeModel = getResult;
  }
});

describe('connectorTypeRegistry.get works', () => {
  test('connector type static data is as expected', () => {
    expect(connectorTypeModel.id).toEqual(SLACK_API_CONNECTOR_ID);
    expect(connectorTypeModel.iconClass).toEqual('logoSlack');
  });
});

describe('Slack action params validation', () => {
  test('should succeed when action params include valid message and channels list', async () => {
    const actionParams = {
      subAction: 'postMessage',
      subActionParams: { channels: ['general'], text: 'some text' },
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        text: [],
        channels: [],
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
        text: [],
        channels: ['Selected channel is required.'],
      },
    });
  });

  test('should fail when field text does not exist', async () => {
    const actionParams = {
      subAction: 'postMessage',
      subActionParams: { channels: ['general'] },
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        text: ['Message is required.'],
        channels: [],
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
        text: ['Message is required.'],
        channels: [],
      },
    });
  });
});
