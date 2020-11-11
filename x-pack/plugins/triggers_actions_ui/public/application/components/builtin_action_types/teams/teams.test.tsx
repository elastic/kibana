/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TypeRegistry } from '../../../type_registry';
import { registerBuiltInActionTypes } from '.././index';
import { ActionTypeModel } from '../../../../types';
import { TeamsActionConnector } from '../types';

const ACTION_TYPE_ID = '.teams';
let actionTypeModel: ActionTypeModel;

beforeAll(async () => {
  const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
  registerBuiltInActionTypes({ actionTypeRegistry });
  const getResult = actionTypeRegistry.get(ACTION_TYPE_ID);
  if (getResult !== null) {
    actionTypeModel = getResult;
  }
});

describe('actionTypeRegistry.get() works', () => {
  test('action type static data is as expected', () => {
    expect(actionTypeModel.id).toEqual(ACTION_TYPE_ID);
    expect(actionTypeModel.iconClass).toEqual('logoWindows');
  });
});

describe('teams connector validation', () => {
  test('connector validation succeeds when connector config is valid', () => {
    const actionConnector = {
      secrets: {
        webhookUrl: 'https:\\test',
      },
      id: 'test',
      actionTypeId: '.teams',
      name: 'team',
      config: {},
    } as TeamsActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        webhookUrl: [],
      },
    });
  });

  test('connector validation fails when connector config is not valid - empty webhook url', () => {
    const actionConnector = {
      secrets: {},
      id: 'test',
      actionTypeId: '.teams',
      name: 'team',
      config: {},
    } as TeamsActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        webhookUrl: ['Webhook URL is required.'],
      },
    });
  });

  test('connector validation fails when connector config is not valid - invalid webhook url', () => {
    const actionConnector = {
      secrets: {
        webhookUrl: 'h',
      },
      id: 'test',
      actionTypeId: '.teams',
      name: 'team',
      config: {},
    } as TeamsActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        webhookUrl: ['Webhook URL is invalid.'],
      },
    });
  });

  test('connector validation fails when connector config is not valid - invalid webhook url protocol', () => {
    const actionConnector = {
      secrets: {
        webhookUrl: 'http://insecure',
      },
      id: 'test',
      actionTypeId: '.teams',
      name: 'team',
      config: {},
    } as TeamsActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        webhookUrl: ['Webhook URL must start with https://.'],
      },
    });
  });
});

describe('teams action params validation', () => {
  test('if action params validation succeeds when action params is valid', () => {
    const actionParams = {
      message: 'message {test}',
    };

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: { message: [] },
    });
  });

  test('params validation fails when message is not valid', () => {
    const actionParams = {
      message: '',
    };

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        message: ['Message is required.'],
      },
    });
  });
});
