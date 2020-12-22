/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TypeRegistry } from '../../../type_registry';
import { registerBuiltInActionTypes } from '.././index';
import { ActionTypeModel, UserConfiguredActionConnector } from '../../../../types';

const ACTION_TYPE_ID = '.server-log';
let actionTypeModel: ActionTypeModel;

beforeAll(() => {
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
    expect(actionTypeModel.iconClass).toEqual('logsApp');
  });
});

describe('server-log connector validation', () => {
  test('connector validation succeeds when connector config is valid', () => {
    const actionConnector: UserConfiguredActionConnector<{}, {}> = {
      secrets: {},
      id: 'test',
      actionTypeId: '.server-log',
      name: 'server-log',
      config: {},
      isPreconfigured: false,
    };

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: {
        errors: {},
      },
      secrets: {
        errors: {},
      },
    });
  });
});

describe('action params validation', () => {
  test('action params validation succeeds when action params is valid', () => {
    const actionParams = {
      message: 'test message',
      level: 'trace',
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
