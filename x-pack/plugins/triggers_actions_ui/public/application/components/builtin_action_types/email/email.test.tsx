/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '../../../type_registry';
import { registerBuiltInActionTypes } from '..';
import { ActionTypeModel } from '../../../../types';
import { EmailActionConnector } from '../types';
import { getEmailServices } from './email';

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

describe('getEmailServices', () => {
  test('should return elastic cloud service if isCloudEnabled is true', () => {
    const services = getEmailServices(true);
    expect(services.find((service) => service.value === 'elastic_cloud')).toBeTruthy();
  });

  test('should not return elastic cloud service if isCloudEnabled is false', () => {
    const services = getEmailServices(false);
    expect(services.find((service) => service.value === 'elastic_cloud')).toBeFalsy();
  });
});

describe('connector validation', () => {
  test('connector validation succeeds when connector config is valid', async () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
        clientSecret: null,
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
        hasAuth: true,
        service: 'other',
      },
    } as EmailActionConnector;

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: {
        errors: {
          from: [],
          port: [],
          host: [],
          service: [],
          clientId: [],
          tenantId: [],
        },
      },
      secrets: {
        errors: {
          user: [],
          password: [],
          clientSecret: [],
        },
      },
    });
  });

  test('connector validation succeeds when connector config is valid with empty user/password', async () => {
    const actionConnector = {
      secrets: {
        user: null,
        password: null,
        clientSecret: null,
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
        hasAuth: false,
        service: 'other',
      },
    } as EmailActionConnector;

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: {
        errors: {
          from: [],
          port: [],
          host: [],
          service: [],
          clientId: [],
          tenantId: [],
        },
      },
      secrets: {
        errors: {
          user: [],
          password: [],
          clientSecret: [],
        },
      },
    });
  });
  test('connector validation fails when connector config is not valid', async () => {
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
        hasAuth: true,
        service: 'other',
      },
    } as EmailActionConnector;

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: {
        errors: {
          from: [],
          port: ['Port is required.'],
          host: ['Host is required.'],
          service: [],
          clientId: [],
          tenantId: [],
        },
      },
      secrets: {
        errors: {
          user: [],
          password: [],
          clientSecret: [],
        },
      },
    });
  });
  test('connector validation fails when user specified but not password', async () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: null,
        clientSecret: null,
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
        hasAuth: true,
        service: 'other',
      },
    } as EmailActionConnector;

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: {
        errors: {
          from: [],
          port: [],
          host: [],
          service: [],
          clientId: [],
          tenantId: [],
        },
      },
      secrets: {
        errors: {
          user: [],
          password: ['Password is required when username is used.'],
          clientSecret: [],
        },
      },
    });
  });
  test('connector validation fails when password specified but not user', async () => {
    const actionConnector = {
      secrets: {
        user: null,
        password: 'password',
        clientSecret: null,
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
        hasAuth: true,
        service: 'other',
      },
    } as EmailActionConnector;

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: {
        errors: {
          from: [],
          port: [],
          host: [],
          service: [],
          clientId: [],
          tenantId: [],
        },
      },
      secrets: {
        errors: {
          user: ['Username is required when password is used.'],
          password: [],
          clientSecret: [],
        },
      },
    });
  });
  test('connector validation fails when server type is not selected', async () => {
    const actionConnector = {
      secrets: {
        user: 'user',
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
        hasAuth: true,
      },
    };

    expect(
      await actionTypeModel.validateConnector(actionConnector as unknown as EmailActionConnector)
    ).toEqual({
      config: {
        errors: {
          from: [],
          port: [],
          host: [],
          service: ['Service is required.'],
          clientId: [],
          tenantId: [],
        },
      },
      secrets: {
        errors: {
          user: [],
          password: [],
          clientSecret: [],
        },
      },
    });
  });
  test('connector validation fails when for exchange service selected, but clientId, tenantId and clientSecrets were not defined', async () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
        clientSecret: null,
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      isPreconfigured: false,
      config: {
        from: 'test@test.com',
        hasAuth: true,
        service: 'exchange_server',
      },
    } as EmailActionConnector;

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: {
        errors: {
          from: [],
          port: [],
          host: [],
          service: [],
          clientId: ['Client ID is required.'],
          tenantId: ['Tenant ID is required.'],
        },
      },
      secrets: {
        errors: {
          clientSecret: ['Client Secret is required.'],
          password: [],
          user: [],
        },
      },
    });
  });
});

describe('action params validation', () => {
  test('action params validation succeeds when action params is valid', async () => {
    const actionParams = {
      to: [],
      cc: ['test1@test.com'],
      message: 'message {test}',
      subject: 'test',
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        to: [],
        cc: [],
        bcc: [],
        message: [],
        subject: [],
      },
    });
  });

  test('action params validation fails when action params is not valid', async () => {
    const actionParams = {
      to: ['test@test.com'],
      subject: 'test',
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
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
