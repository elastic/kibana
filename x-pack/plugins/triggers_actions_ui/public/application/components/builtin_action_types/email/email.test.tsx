/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TypeRegistry } from '../../../type_registry';
import { registerBuiltInActionTypes } from '../index';
import { ActionTypeModel } from '../../../../types';
import { EmailActionConnector } from '../types';

const ACTION_TYPE_ID = '.email';
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
    expect(actionTypeModel.iconClass).toEqual('email');
  });
});

describe('connector validation', () => {
  test('connector validation succeeds when connector config is valid', () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      isPreconfigured: false,
      config: {
        from: 'test@test.com',
        port: 2323,
        host: 'localhost',
        test: 'test',
      },
    } as EmailActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        from: [],
        port: [],
        host: [],
        user: [],
        password: [],
      },
    });
  });

  test('connector validation succeeds when connector config is valid with empty user/password', () => {
    const actionConnector = {
      secrets: {
        user: null,
        password: null,
      },
      id: 'test',
      actionTypeId: '.email',
      isPreconfigured: false,
      name: 'email',
      config: {
        from: 'test@test.com',
        port: 2323,
        host: 'localhost',
        test: 'test',
      },
    } as EmailActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        from: [],
        port: [],
        host: [],
        user: [],
        password: [],
      },
    });
  });
  test('connector validation fails when connector config is not valid', () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        from: 'test@test.com',
      },
    } as EmailActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        from: [],
        port: ['Port is required.'],
        host: ['Host is required.'],
        user: [],
        password: [],
      },
    });
  });
  test('connector validation fails when user specified but not password', () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: null,
      },
      id: 'test',
      actionTypeId: '.email',
      isPreconfigured: false,
      name: 'email',
      config: {
        from: 'test@test.com',
        port: 2323,
        host: 'localhost',
        test: 'test',
      },
    } as EmailActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        from: [],
        port: [],
        host: [],
        user: [],
        password: ['Password is required when username is used.'],
      },
    });
  });
  test('connector validation fails when password specified but not user', () => {
    const actionConnector = {
      secrets: {
        user: null,
        password: 'password',
      },
      id: 'test',
      actionTypeId: '.email',
      isPreconfigured: false,
      name: 'email',
      config: {
        from: 'test@test.com',
        port: 2323,
        host: 'localhost',
        test: 'test',
      },
    } as EmailActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        from: [],
        port: [],
        host: [],
        user: ['Username is required when password is used.'],
        password: [],
      },
    });
  });
});

describe('action params validation', () => {
  test('action params validation succeeds when action params is valid', () => {
    const actionParams = {
      to: [],
      cc: ['test1@test.com'],
      message: 'message {test}',
      subject: 'test',
    };

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        to: [],
        cc: [],
        bcc: [],
        message: [],
        subject: [],
      },
    });
  });

  test('action params validation fails when action params is not valid', () => {
    const actionParams = {
      to: ['test@test.com'],
      subject: 'test',
    };

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        to: [],
        cc: [],
        bcc: [],
        message: ['Message is required.'],
        subject: [],
      },
    });
  });
});
