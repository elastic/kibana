/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./lib/post_xmatters', () => ({
  postXmatters: jest.fn(),
}));

import { Services } from '../types';
import { validateConfig, validateSecrets, validateParams, validateConnector } from '../lib';
import { postXmatters } from './lib/post_xmatters';
import { actionsConfigMock } from '../actions_config.mock';
import { createActionTypeRegistry } from './index.test';
import { Logger } from '@kbn/core/server';
import { actionsMock } from '../mocks';
import {
  ActionParamsType,
  ActionTypeConfigType,
  ActionTypeSecretsType,
  getActionType,
  XmattersActionType,
} from './xmatters';

const postxMattersMock = postXmatters as jest.Mock;

const ACTION_TYPE_ID = '.xmatters';

const services: Services = actionsMock.createServices();

let actionType: XmattersActionType;
let mockedLogger: jest.Mocked<Logger>;

beforeAll(() => {
  const { logger, actionTypeRegistry } = createActionTypeRegistry();
  actionType = actionTypeRegistry.get<
    ActionTypeConfigType,
    ActionTypeSecretsType,
    ActionParamsType
  >(ACTION_TYPE_ID);
  mockedLogger = logger;
});

beforeEach(() => {
  actionType = getActionType({
    logger: mockedLogger,
    configurationUtilities: actionsConfigMock.create(),
  });
});

describe('actionType', () => {
  test('exposes the action as `xmatters` on its Id and Name', () => {
    expect(actionType.id).toEqual('.xmatters');
    expect(actionType.name).toEqual('xMatters');
  });
});

describe('secrets validation', () => {
  test('succeeds when secrets is valid with user and password', () => {
    const secrets: Record<string, string> = {
      user: 'bob',
      password: 'supersecret',
    };
    expect(validateSecrets(actionType, secrets)).toEqual({
      ...secrets,
      secretsUrl: null,
    });
  });

  test('succeeds when secrets is valid with url auth', () => {
    const secrets: Record<string, string> = {
      secretsUrl: 'http://mylisteningserver:9200/endpoint?apiKey=someKey',
    };
    expect(validateSecrets(actionType, secrets)).toEqual({
      ...secrets,
      user: null,
      password: null,
    });
  });

  test('fails when url auth is provided with user', () => {
    const secrets: Record<string, string> = {
      user: 'bob',
      secretsUrl: 'http://mylisteningserver:9200/endpoint?apiKey=someKey',
    };
    expect(() => {
      validateSecrets(actionType, secrets);
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: Cannot use user/password for URL authentication. Provide valid secretsUrl or use Basic Authentication."`
    );
  });

  test('fails when url auth is provided with password', () => {
    const secrets: Record<string, string> = {
      password: 'supersecret',
      secretsUrl: 'http://mylisteningserver:9200/endpoint?apiKey=someKey',
    };
    expect(() => {
      validateSecrets(actionType, secrets);
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: Cannot use user/password for URL authentication. Provide valid secretsUrl or use Basic Authentication."`
    );
  });

  test('fails when url auth is provided with user and password', () => {
    const secrets: Record<string, string> = {
      user: 'bob',
      password: 'supersecret',
      secretsUrl: 'http://mylisteningserver:9200/endpoint?apiKey=someKey',
    };
    expect(() => {
      validateSecrets(actionType, secrets);
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: Cannot use user/password for URL authentication. Provide valid secretsUrl or use Basic Authentication."`
    );
  });

  test('fails when secret user is provided, but password is omitted', () => {
    expect(() => {
      validateSecrets(actionType, { user: 'bob' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: Both user and password must be specified."`
    );
  });

  test('fails when password is provided, but user is omitted', () => {
    expect(() => {
      validateSecrets(actionType, { password: 'supersecret' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: Both user and password must be specified."`
    );
  });

  test('fails when user, password, and secretsUrl are omitted', () => {
    expect(() => {
      validateSecrets(actionType, {});
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: Provide either secretsUrl link or user/password to authenticate"`
    );
  });

  test('fails when url is invalid', () => {
    const secrets: Record<string, string> = {
      secretsUrl: 'example.com/do-something?apiKey=someKey',
    };
    expect(() => {
      validateSecrets(actionType, secrets);
    }).toThrowErrorMatchingInlineSnapshot(
      '"error validating action type secrets: Invalid secretsUrl: TypeError: Invalid URL: example.com/do-something?apiKey=someKey"'
    );
  });

  test('fails when url host is not in allowedHosts', () => {
    actionType = getActionType({
      logger: mockedLogger,
      configurationUtilities: {
        ...actionsConfigMock.create(),
        ensureUriAllowed: (_) => {
          throw new Error(`target url is not present in allowedHosts`);
        },
      },
    });
    const secrets: Record<string, string> = {
      secretsUrl: 'http://mylisteningserver.com:9200/endpoint',
    };

    expect(() => {
      validateSecrets(actionType, secrets);
    }).toThrowErrorMatchingInlineSnapshot(
      '"error validating action type secrets: target url is not present in allowedHosts"'
    );
  });
});

describe('config validation', () => {
  test('config validation passes when useBasic is true and url is provided', () => {
    const config: Record<string, string | boolean> = {
      configUrl: 'http://mylisteningserver:9200/endpoint',
      usesBasic: true,
    };
    expect(validateConfig(actionType, config)).toEqual(config);
  });

  test('config validation failed when a url is invalid', () => {
    const config: Record<string, string | boolean> = {
      configUrl: 'example.com/do-something',
      usesBasic: true,
    };
    expect(() => {
      validateConfig(actionType, config);
    }).toThrowErrorMatchingInlineSnapshot(
      '"error validating action type config: Error configuring xMatters action: unable to parse url: TypeError: Invalid URL: example.com/do-something"'
    );
  });

  test('config validation returns an error if the specified URL isnt added to allowedHosts', () => {
    actionType = getActionType({
      logger: mockedLogger,
      configurationUtilities: {
        ...actionsConfigMock.create(),
        ensureUriAllowed: (_) => {
          throw new Error(`target url is not present in allowedHosts`);
        },
      },
    });

    const config: Record<string, string | boolean> = {
      configUrl: 'http://mylisteningserver.com:9200/endpoint',
      usesBasic: true,
    };

    expect(() => {
      validateConfig(actionType, config);
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: Error configuring xMatters action: target url is not present in allowedHosts"`
    );
  });

  test('config validations returns successful useBasic is false and no url is provided', () => {
    const config: Record<string, null | boolean> = {
      configUrl: null,
      usesBasic: false,
    };

    expect(validateConfig(actionType, config)).toEqual(config);
  });
});

describe('params validation', () => {
  test('param validation passes when only required fields are provided', () => {
    const params: Record<string, string> = {
      severity: 'high',
    };
    expect(validateParams(actionType, params)).toEqual({
      severity: 'high',
    });
  });

  test('params validation passes when a valid parameters are provided', () => {
    const params: Record<string, string> = {
      alertActionGroupName: 'Small t-shirt',
      signalId: 'c9437cab-6a5b-45e8-bc8a-f4a8af440e97:abcd-1234',
      ruleName: 'Test xMatters',
      date: '2022-01-18T19:01:08.818Z',
      severity: 'high',
      spaceId: 'default',
      tags: 'test1, test2',
    };
    expect(validateParams(actionType, params)).toEqual({
      ...params,
    });
  });
});

describe('connector validation', () => {
  test('connector validation fails when configUrl passed with out user and password', () => {
    const config: Record<string, string | boolean> = {
      configUrl: 'http://mylisteningserver.com:9200/endpoint',
      usesBasic: true,
    };
    const secrets: Record<string, string> = {};
    expect(() => {
      validateConnector(actionType, { config, secrets });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type connector: Provide valid Username"`
    );
  });

  test('connector validation fails when configUrl passed with out password', () => {
    const config: Record<string, string | boolean> = {
      configUrl: 'http://mylisteningserver.com:9200/endpoint',
      usesBasic: true,
    };
    const secrets: Record<string, string> = {
      user: 'bob',
    };
    expect(() => {
      validateConnector(actionType, { config, secrets });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type connector: Provide valid Password"`
    );
  });

  test('connector validation fails when user and password passed with out configUrl', () => {
    const config: Record<string, string | boolean> = {
      usesBasic: true,
    };
    const secrets: Record<string, string> = {
      user: 'bob',
      password: 'supersecret',
    };
    expect(() => {
      validateConnector(actionType, { config, secrets });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type connector: Provide valid configUrl"`
    );
  });

  test('connector validation fails when secretsUrl passed with user and password', () => {
    const config: Record<string, string | boolean> = {
      usesBasic: false,
    };
    const secrets: Record<string, string> = {
      user: 'bob',
      password: 'supersecret',
      secretsUrl: 'http://mylisteningserver:9200/endpoint',
    };
    expect(() => {
      validateConnector(actionType, { config, secrets });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type connector: Username and password should not be provided when usesBasic is false"`
    );
  });

  test('connector validation fails when configUrl and secretsUrl passed in', () => {
    const config: Record<string, string | boolean> = {
      configUrl: 'http://mylisteningserver.com:9200/endpoint',
      usesBasic: true,
    };
    const secrets: Record<string, string> = {
      user: 'bob',
      password: 'supersecret',
      secretsUrl: 'http://mylisteningserver:9200/endpoint',
    };
    expect(() => {
      validateConnector(actionType, { config, secrets });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type connector: secretsUrl should not be provided when usesBasic is true"`
    );
  });

  test('connector validation fails when usesBasic is true, but url auth used', () => {
    const config: Record<string, string | boolean> = {
      usesBasic: true,
    };
    const secrets: Record<string, string> = {
      secretsUrl: 'http://mylisteningserver:9200/endpoint',
    };
    expect(() => {
      validateConnector(actionType, { config, secrets });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type connector: secretsUrl should not be provided when usesBasic is true"`
    );
  });

  test('connector validation fails when usesBasic is false, but basic auth used', () => {
    const config: Record<string, string | boolean> = {
      configUrl: 'http://mylisteningserver.com:9200/endpoint',
      usesBasic: false,
    };
    const secrets: Record<string, string> = {
      user: 'bob',
      password: 'supersecret',
    };
    expect(() => {
      validateConnector(actionType, { config, secrets });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type connector: Username and password should not be provided when usesBasic is false"`
    );
  });

  test('connector validation fails when usesBasic is false, but configUrl passed in', () => {
    const config: Record<string, string | boolean> = {
      configUrl: 'http://mylisteningserver.com:9200/endpoint',
      usesBasic: false,
    };
    const secrets: Record<string, string> = {};
    expect(() => {
      validateConnector(actionType, { config, secrets });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type connector: configUrl should not be provided when usesBasic is false"`
    );
  });

  test('connector validation succeeds with basic auth', () => {
    const config: Record<string, string | boolean> = {
      configUrl: 'http://mylisteningserver.com:9200/endpoint',
      usesBasic: true,
    };
    const secrets: Record<string, string> = {
      user: 'bob',
      password: 'supersecret',
    };
    expect(validateConnector(actionType, { config, secrets })).toEqual(null);
  });

  test('connector validation succeeds with url auth', () => {
    const config: Record<string, string | boolean> = {
      usesBasic: false,
    };
    const secrets: Record<string, string> = {
      secretsUrl: 'http://mylisteningserver:9200/endpoint',
    };
    expect(validateConnector(actionType, { config, secrets })).toEqual(null);
  });
});

describe('execute()', () => {
  beforeEach(() => {
    postxMattersMock.mockReset();
    postxMattersMock.mockResolvedValue({
      status: 200,
      statusText: '',
      data: '',
      config: {},
    });
  });

  test('execute with useBasic=true uses authentication object', async () => {
    const config: ActionTypeConfigType = {
      configUrl: 'https://abc.def/my-xmatters',
      usesBasic: true,
    };
    await actionType.executor({
      actionId: 'some-id',
      services,
      config,
      secrets: { secretsUrl: null, user: 'abc', password: '123' },
      params: {
        alertActionGroupName: 'Small t-shirt',
        signalId: 'c9437cab-6a5b-45e8-bc8a-f4a8af440e97:abcd-1234',
        ruleName: 'Test xMatters',
        date: '2022-01-18T19:01:08.818Z',
        severity: 'high',
        spaceId: 'default',
        tags: 'test1, test2',
      },
    });

    expect(postxMattersMock.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "basicAuth": Object {
          "auth": Object {
            "password": "123",
            "username": "abc",
          },
        },
        "data": Object {
          "alertActionGroupName": "Small t-shirt",
          "date": "2022-01-18T19:01:08.818Z",
          "ruleName": "Test xMatters",
          "severity": "high",
          "signalId": "c9437cab-6a5b-45e8-bc8a-f4a8af440e97:abcd-1234",
          "spaceId": "default",
          "tags": "test1, test2",
        },
        "url": "https://abc.def/my-xmatters",
      }
    `);
  });

  test('execute with exception maxContentLength size exceeded should log the proper error', async () => {
    const config: ActionTypeConfigType = {
      configUrl: 'https://abc.def/my-xmatters',
      usesBasic: true,
    };
    postxMattersMock.mockRejectedValueOnce({
      tag: 'err',
      message: 'maxContentLength size of 1000000 exceeded',
    });
    await actionType.executor({
      actionId: 'some-id',
      services,
      config,
      secrets: { secretsUrl: null, user: 'abc', password: '123' },
      params: {
        alertActionGroupName: 'Small t-shirt',
        signalId: 'c9437cab-6a5b-45e8-bc8a-f4a8af440e97:abcd-1234',
        ruleName: 'Test xMatters',
        date: '2022-01-18T19:01:08.818Z',
        severity: 'high',
        spaceId: 'default',
        tags: 'test1, test2',
      },
    });
    expect(mockedLogger.warn).toBeCalledWith(
      'Error thrown triggering xMatters workflow: maxContentLength size of 1000000 exceeded'
    );
  });

  test('execute with useBasic=false uses empty authentication object', async () => {
    const config: ActionTypeConfigType = {
      configUrl: null,
      usesBasic: false,
    };
    const secrets: ActionTypeSecretsType = {
      user: null,
      password: null,
      secretsUrl: 'https://abc.def/my-xmatters?apiKey=someKey',
    };
    await actionType.executor({
      actionId: 'some-id',
      services,
      config,
      secrets,
      params: {
        alertActionGroupName: 'Small t-shirt',
        signalId: 'c9437cab-6a5b-45e8-bc8a-f4a8af440e97:abcd-1234',
        ruleName: 'Test xMatters',
        date: '2022-01-18T19:01:08.818Z',
        severity: 'high',
        spaceId: 'default',
        tags: 'test1, test2',
      },
    });

    expect(postxMattersMock.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "basicAuth": undefined,
        "data": Object {
          "alertActionGroupName": "Small t-shirt",
          "date": "2022-01-18T19:01:08.818Z",
          "ruleName": "Test xMatters",
          "severity": "high",
          "signalId": "c9437cab-6a5b-45e8-bc8a-f4a8af440e97:abcd-1234",
          "spaceId": "default",
          "tags": "test1, test2",
        },
        "url": "https://abc.def/my-xmatters?apiKey=someKey",
      }
    `);
  });
});
