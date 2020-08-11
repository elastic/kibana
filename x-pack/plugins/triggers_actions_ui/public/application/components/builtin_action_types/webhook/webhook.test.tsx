/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TypeRegistry } from '../../../type_registry';
import { registerBuiltInActionTypes } from '.././index';
import { ActionTypeModel } from '../../../../types';
import { WebhookActionConnector } from '../types';

const ACTION_TYPE_ID = '.webhook';
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
    expect(actionTypeModel.iconClass).toEqual('logoWebhook');
  });
});

describe('webhook connector validation', () => {
  test('connector validation succeeds when connector config is valid', () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.webhook',
      name: 'webhook',
      isPreconfigured: false,
      config: {
        method: 'PUT',
        url: 'http://test.com',
        headers: { 'content-type': 'text' },
      },
    } as WebhookActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        url: [],
        method: [],
        user: [],
        password: [],
      },
    });
  });

  test('connector validation fails when connector config is not valid', () => {
    const actionConnector = {
      secrets: {
        user: 'user',
      },
      id: 'test',
      actionTypeId: '.webhook',
      name: 'webhook',
      config: {
        method: 'PUT',
      },
    } as WebhookActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        url: ['URL is required.'],
        method: [],
        user: [],
        password: ['Password is required.'],
      },
    });
  });

  test('connector validation fails when url in config is not valid', () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.webhook',
      name: 'webhook',
      config: {
        method: 'PUT',
        url: 'invalid.url',
      },
    } as WebhookActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        url: ['URL is invalid.'],
        method: [],
        user: [],
        password: [],
      },
    });
  });
});

describe('webhook action params validation', () => {
  test('action params validation succeeds when action params is valid', () => {
    const actionParams = {
      body: 'message {test}',
    };

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: { body: [] },
    });
  });

  test('params validation fails when body is not valid', () => {
    const actionParams = {
      body: '',
    };

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        body: ['Body is required.'],
      },
    });
  });
});
