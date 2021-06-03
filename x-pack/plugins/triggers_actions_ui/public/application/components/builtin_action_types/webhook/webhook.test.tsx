/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  test('connector validation succeeds when hasAuth is true and connector config is valid', async () => {
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
        hasAuth: true,
      },
    } as WebhookActionConnector;

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: {
        errors: {
          url: [],
          method: [],
        },
      },
      secrets: {
        errors: {
          user: [],
          password: [],
        },
      },
    });
  });

  test('connector validation succeeds when hasAuth is false and connector config is valid', async () => {
    const actionConnector = {
      secrets: {
        user: '',
        password: '',
      },
      id: 'test',
      actionTypeId: '.webhook',
      name: 'webhook',
      isPreconfigured: false,
      config: {
        method: 'PUT',
        url: 'http://test.com',
        headers: { 'content-type': 'text' },
        hasAuth: false,
      },
    } as WebhookActionConnector;

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: {
        errors: {
          url: [],
          method: [],
        },
      },
      secrets: {
        errors: {
          user: [],
          password: [],
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
      actionTypeId: '.webhook',
      name: 'webhook',
      config: {
        method: 'PUT',
        hasAuth: true,
      },
    } as WebhookActionConnector;

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: {
        errors: {
          url: ['URL is required.'],
          method: [],
        },
      },
      secrets: {
        errors: {
          user: [],
          password: ['Password is required when username is used.'],
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
      actionTypeId: '.webhook',
      name: 'webhook',
      config: {
        method: 'PUT',
        url: 'invalid.url',
        hasAuth: true,
      },
    } as WebhookActionConnector;

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: {
        errors: {
          url: ['URL is invalid.'],
          method: [],
        },
      },
      secrets: {
        errors: {
          user: [],
          password: [],
        },
      },
    });
  });
});

describe('webhook action params validation', () => {
  test('action params validation succeeds when action params is valid', async () => {
    const actionParams = {
      body: 'message {test}',
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: { body: [] },
    });
  });

  test('params validation fails when body is not valid', async () => {
    const actionParams = {
      body: '',
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        body: ['Body is required.'],
      },
    });
  });
});
