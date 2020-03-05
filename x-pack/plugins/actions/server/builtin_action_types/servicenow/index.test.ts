/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../lib/post_servicenow', () => ({
  postServiceNow: jest.fn(),
}));

import { getActionType } from '.';
import { ActionType, Services, ActionTypeExecutorOptions } from '../../types';
import { validateConfig, validateSecrets, validateParams } from '../../lib';
import { savedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import { postServiceNow } from '../lib/post_servicenow';
import { createActionTypeRegistry } from '../index.test';
import { configUtilsMock } from '../../actions_config.mock';

import { ServiceNow } from '../lib/servicenow';
import { ACTION_TYPE_ID } from './constants';
import * as i18n from './translations';

jest.mock('../lib/servicenow');

const postServiceNowMock = postServiceNow as jest.Mock;

const services: Services = {
  callCluster: async (path: string, opts: any) => {},
  savedObjectsClient: savedObjectsClientMock.create(),
};

let actionType: ActionType;

const mockOptions = {
  name: 'servicenow-connector',
  actionTypeId: '.servicenow',
  secrets: {
    username: 'secret-username',
    password: 'secret-password',
  },
  config: {
    apiUrl: 'https://service-now.com',
    casesConfiguration: {
      closure: 'manual',
      mapping: [
        {
          source: 'title',
          target: 'short_description',
          onEditAndUpdate: 'overwrite',
        },
        {
          source: 'description',
          target: 'description',
          onEditAndUpdate: 'overwrite',
        },
        {
          source: 'comments',
          target: 'work_notes',
          onEditAndUpdate: 'append',
        },
      ],
    },
  },
  params: {
    executorAction: 'updateIncident',
    id: 'd4387ac5-0899-4dc2-bbfa-0dd605c934aa',
    incidentId: 'ceb5986e079f00100e48fbbf7c1ed06d',
    title: 'Incident title',
    description: 'Incident description',
    comments: [
      {
        id: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
        version: 'WzU3LDFd',
        comment: 'A comment',
      },
    ],
  },
};

beforeAll(() => {
  const { actionTypeRegistry } = createActionTypeRegistry();
  actionType = actionTypeRegistry.get(ACTION_TYPE_ID);
});

describe('get()', () => {
  test('should return correct action type', () => {
    expect(actionType.id).toEqual(ACTION_TYPE_ID);
    expect(actionType.name).toEqual(i18n.NAME);
  });
});

describe('validateConfig()', () => {
  test('should validate and pass when config is valid', () => {
    const { config } = mockOptions;
    expect(validateConfig(actionType, config)).toEqual(config);
  });

  test('should validate and throw error when config is invalid', () => {
    expect(() => {
      validateConfig(actionType, { shouldNotBeHere: true });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [apiUrl]: expected value of type [string] but got [undefined]"`
    );
  });

  test('should validate and pass when the servicenow url is whitelisted', () => {
    actionType = getActionType({
      configurationUtilities: {
        ...configUtilsMock,
        ensureWhitelistedUri: url => {
          expect(url).toEqual(mockOptions.config.apiUrl);
        },
      },
    });

    expect(validateConfig(actionType, mockOptions.config)).toEqual(mockOptions.config);
  });

  test('config validation returns an error if the specified URL isnt whitelisted', () => {
    actionType = getActionType({
      configurationUtilities: {
        ...configUtilsMock,
        ensureWhitelistedUri: _ => {
          throw new Error(`target url is not whitelisted`);
        },
      },
    });

    expect(() => {
      validateConfig(actionType, mockOptions.config);
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: error configuring servicenow action: target url is not whitelisted"`
    );
  });
});

describe('validateSecrets()', () => {
  test('should validate and pass when secrets is valid', () => {
    const { secrets } = mockOptions;
    expect(validateSecrets(actionType, secrets)).toEqual(secrets);
  });

  test('should validate and throw error when secrets is invalid', () => {
    expect(() => {
      validateSecrets(actionType, { username: false });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [password]: expected value of type [string] but got [undefined]"`
    );

    expect(() => {
      validateSecrets(actionType, { username: false, password: 'hello' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [username]: expected value of type [string] but got [boolean]"`
    );
  });
});

describe('validateParams()', () => {
  test('should validate and pass when params is valid', () => {
    const { params } = mockOptions;
    expect(validateParams(actionType, params)).toEqual(params);
  });

  test('should validate and throw error when params is invalid', () => {
    expect(() => {
      validateParams(actionType, {});
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [executorAction]: expected at least one defined value but got [undefined]"`
    );
  });
});

describe('execute()', () => {
  beforeEach(() => {
    postServiceNowMock.mockReset();
  });
  const { config, params, secrets } = mockServiceNow;
  test('should succeed with valid params', async () => {
    postServiceNowMock.mockImplementation(() => {
      return { status: 201, data: 'data-here' };
    });

    const actionId = 'some-action-id';
    const executorOptions: ActionTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
    };
    const actionResponse = await actionType.executor(executorOptions);
    const { apiUrl, data, headers } = postServiceNowMock.mock.calls[0][0];
    expect({ apiUrl, data, headers, secrets }).toMatchInlineSnapshot(`
      Object {
        "apiUrl": "www.servicenowisinkibanaactions.com",
        "data": Object {
          "comments": "hello cool service now incident",
          "short_description": "this is a cool service now incident",
        },
        "headers": Object {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        "secrets": Object {
          "password": "secret-password",
          "username": "secret-username",
        },
      }
    `);
    expect(actionResponse).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-action-id",
        "data": "data-here",
        "status": "ok",
      }
    `);
  });

  test('should fail when postServiceNow throws', async () => {
    postServiceNowMock.mockImplementation(() => {
      throw new Error('doing some testing');
    });

    const actionId = 'some-action-id';
    const executorOptions: ActionTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
    };
    const actionResponse = await actionType.executor(executorOptions);
    expect(actionResponse).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-action-id",
        "message": "error posting servicenow event",
        "serviceMessage": "doing some testing",
        "status": "error",
      }
    `);
  });

  test('should fail when postServiceNow returns 429', async () => {
    postServiceNowMock.mockImplementation(() => {
      return { status: 429, data: 'data-here' };
    });

    const actionId = 'some-action-id';
    const executorOptions: ActionTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
    };
    const actionResponse = await actionType.executor(executorOptions);
    expect(actionResponse).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-action-id",
        "message": "error posting servicenow event: http status 429, retry later",
        "retry": true,
        "status": "error",
      }
    `);
  });

  test('should fail when postServiceNow returns 501', async () => {
    postServiceNowMock.mockImplementation(() => {
      return { status: 501, data: 'data-here' };
    });

    const actionId = 'some-action-id';
    const executorOptions: ActionTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
    };
    const actionResponse = await actionType.executor(executorOptions);
    expect(actionResponse).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-action-id",
        "message": "error posting servicenow event: http status 501, retry later",
        "retry": true,
        "status": "error",
      }
    `);
  });

  test('should fail when postServiceNow returns 418', async () => {
    postServiceNowMock.mockImplementation(() => {
      return { status: 418, data: 'data-here' };
    });

    const actionId = 'some-action-id';
    const executorOptions: ActionTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
    };
    const actionResponse = await actionType.executor(executorOptions);
    expect(actionResponse).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-action-id",
        "message": "error posting servicenow event: unexpected status 418",
        "status": "error",
      }
    `);
  });
});
