/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '../../../type_registry';
import { registerBuiltInActionTypes } from '..';
import { ActionTypeModel } from '../../../../types';
import { XmattersActionConnector } from '../types';

const ACTION_TYPE_ID = '.xmatters';
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
    expect(actionTypeModel.actionTypeTitle).toEqual('xMatters data');
  });
});

describe('xmatters connector validation', () => {
  test('connector validation succeeds when usesBasic is true and connector config is valid', async () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.xmatters',
      name: 'xmatters',
      isPreconfigured: false,
      config: {
        configUrl: 'http://test.com',
        usesBasic: true,
      },
    } as XmattersActionConnector;

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: {
        errors: {
          configUrl: [],
        },
      },
      secrets: {
        errors: {
          user: [],
          password: [],
          secretsUrl: [],
        },
      },
    });
  });

  test('connector validation succeeds when usesBasic is false and connector config is valid', async () => {
    const actionConnector = {
      secrets: {
        user: '',
        password: '',
        secretsUrl: 'https://test.com?apiKey=someKey',
      },
      id: 'test',
      actionTypeId: '.xmatters',
      name: 'xmatters',
      isPreconfigured: false,
      config: {
        usesBasic: false,
      },
    } as XmattersActionConnector;

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: {
        errors: {
          configUrl: [],
        },
      },
      secrets: {
        errors: {
          user: [],
          password: [],
          secretsUrl: [],
        },
      },
    });
  });

  test('connector validation fails when connector config is not valid', async () => {
    const actionConnector = {
      secrets: {
        user: 'user',
      },
      id: 'test',
      actionTypeId: '.xmatters',
      name: 'xmatters',
      config: {
        usesBasic: true,
      },
    } as XmattersActionConnector;

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: {
        errors: {
          configUrl: ['URL is required.'],
        },
      },
      secrets: {
        errors: {
          user: [],
          password: ['Password is required when username is used.'],
          secretsUrl: [],
        },
      },
    });
  });

  test('connector validation fails when url in config is not valid', async () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.xmatters',
      name: 'xmatters',
      config: {
        configUrl: 'invalid.url',
        usesBasic: true,
      },
    } as XmattersActionConnector;

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: {
        errors: {
          configUrl: ['URL is invalid.'],
        },
      },
      secrets: {
        errors: {
          user: [],
          password: [],
          secretsUrl: [],
        },
      },
    });
  });
});

describe('xmatters action params validation', () => {
  test('action params validation succeeds when action params is valid', async () => {
    const actionParams = {
      alertActionGroupName: 'Small t-shirt',
      signalId: 'c9437cab-6a5b-45e8-bc8a-f4a8af440e97',
      ruleName: 'Test xMatters',
      date: '2022-01-18T19:01:08.818Z',
      severity: 'high',
      spaceId: 'default',
      tags: 'test1, test2',
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: { alertActionGroupName: [], signalId: [] },
    });
  });
});
