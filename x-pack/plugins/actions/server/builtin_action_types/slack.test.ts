/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import http from 'http';
import httpProxy from 'http-proxy';
import { Logger } from '../../../../../src/core/server';
import { Services, ActionTypeExecutorResult } from '../types';
import { validateParams, validateSecrets } from '../lib';
import { getActionType, SlackActionType, SlackActionTypeExecutorOptions } from './slack';
import { actionsConfigMock } from '../actions_config.mock';
import { actionsMock } from '../mocks';
import { createActionTypeRegistry } from './index.test';

const ACTION_TYPE_ID = '.slack';

const services: Services = actionsMock.createServices();

let actionType: SlackActionType;
let mockedLogger: jest.Mocked<Logger>;

beforeAll(() => {
  const { logger } = createActionTypeRegistry();
  actionType = getActionType({
    async executor(options) {
      return { status: 'ok', actionId: options.actionId };
    },
    configurationUtilities: actionsConfigMock.create(),
    logger,
  });
  mockedLogger = logger;
  expect(actionType).toBeTruthy();
});

describe('action registeration', () => {
  test('returns action type', () => {
    expect(actionType.id).toEqual(ACTION_TYPE_ID);
    expect(actionType.name).toEqual('Slack');
  });
});

describe('validateParams()', () => {
  test('should validate and pass when params is valid', () => {
    expect(validateParams(actionType, { message: 'a message' })).toEqual({
      message: 'a message',
    });
  });

  test('should validate and throw error when params is invalid', () => {
    expect(() => {
      validateParams(actionType, {});
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [message]: expected value of type [string] but got [undefined]"`
    );

    expect(() => {
      validateParams(actionType, { message: 1 });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [message]: expected value of type [string] but got [number]"`
    );
  });
});

describe('validateActionTypeSecrets()', () => {
  test('should validate and pass when config is valid', () => {
    validateSecrets(actionType, {
      webhookUrl: 'https://example.com',
    });
  });

  test('should validate and throw error when config is invalid', () => {
    expect(() => {
      validateSecrets(actionType, {});
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [webhookUrl]: expected value of type [string] but got [undefined]"`
    );

    expect(() => {
      validateSecrets(actionType, { webhookUrl: 1 });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [webhookUrl]: expected value of type [string] but got [number]"`
    );

    expect(() => {
      validateSecrets(actionType, { webhookUrl: 'fee-fi-fo-fum' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: error configuring slack action: unable to parse host name from webhookUrl"`
    );
  });

  test('should validate and pass when the slack webhookUrl is whitelisted', () => {
    actionType = getActionType({
      logger: mockedLogger,
      configurationUtilities: {
        ...actionsConfigMock.create(),
        ensureWhitelistedUri: (url) => {
          expect(url).toEqual('https://api.slack.com/');
        },
      },
    });

    expect(validateSecrets(actionType, { webhookUrl: 'https://api.slack.com/' })).toEqual({
      webhookUrl: 'https://api.slack.com/',
    });
  });

  test('config validation returns an error if the specified URL isnt whitelisted', () => {
    actionType = getActionType({
      logger: mockedLogger,
      configurationUtilities: {
        ...actionsConfigMock.create(),
        ensureWhitelistedHostname: () => {
          throw new Error(`target hostname is not whitelisted`);
        },
      },
    });

    expect(() => {
      validateSecrets(actionType, { webhookUrl: 'https://api.slack.com/' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: error configuring slack action: target hostname is not whitelisted"`
    );
  });
});

describe('execute()', () => {
  beforeAll(() => {
    async function mockSlackExecutor(options: SlackActionTypeExecutorOptions) {
      const { params } = options;
      const { message } = params;
      if (message == null) throw new Error('message property required in parameter');

      const failureMatch = message.match(/^failure: (.*)$/);
      if (failureMatch != null) {
        const failMessage = failureMatch[1];
        throw new Error(`slack mockExecutor failure: ${failMessage}`);
      }

      return {
        text: `slack mockExecutor success: ${message}`,
        actionId: '',
        status: 'ok',
      } as ActionTypeExecutorResult<void>;
    }

    actionType = getActionType({
      executor: mockSlackExecutor,
      logger: mockedLogger,
      configurationUtilities: actionsConfigMock.create(),
    });
  });

  test('calls the mock executor with success', async () => {
    const response = await actionType.executor({
      actionId: 'some-id',
      services,
      config: {},
      secrets: { webhookUrl: 'http://example.com' },
      params: { message: 'this invocation should succeed' },
    });
    expect(response).toMatchInlineSnapshot(`
      Object {
        "actionId": "",
        "status": "ok",
        "text": "slack mockExecutor success: this invocation should succeed",
      }
    `);
    // expect(mockedLogger.info).toHaveBeenCalledWith('Create proxy agent for ');
  });

  test('calls the mock executor with failure', async () => {
    await expect(
      actionType.executor({
        actionId: 'some-id',
        services,
        config: {},
        secrets: { webhookUrl: 'http://example.com' },
        params: { message: 'failure: this invocation should fail' },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"slack mockExecutor failure: this invocation should fail"`
    );
  });

  describe('proxy support', function () {
    const proxyPort = 1212;
    const proxyUrl = `http://localhost:${proxyPort}`;
    // const serverPort = 3434;
    // const serverUrl = `http://localhost:${serverPort}`;
    let actionTypeWithProxy: SlackActionType;

    let proxyHit = false;
    let proxyConnectHit = false;

    const proxy = httpProxy.createProxyServer({
      target: 'http://example.com',
    });

    proxy.on('proxyRes', (proxyRes: unknown, req: unknown, res: unknown) => {
      proxyHit = true;
    });

    function expectProxyHit() {
      expect(proxyHit).toBe(true);
    }

    function expectNoProxyHit() {
      expect(proxyHit).toBe(false);
    }

    beforeAll(() => {
      actionTypeWithProxy = getActionType({
        logger: mockedLogger,
        configurationUtilities: actionsConfigMock.create(),
      });

      // slackServer.listen(serverPort);
      proxy.listen(proxyPort);
    });

    beforeEach(function () {
      proxyHit = false;
      proxyConnectHit = false;
    });

    test('should use http_proxy', async () => {
      await actionTypeWithProxy.executor({
        actionId: 'some-id',
        services,
        config: {},
        secrets: { webhookUrl: 'http://example.com' },
        params: { message: 'this invocation should succeed' },
        proxySettings: {
          proxyUrl,
          rejectUnauthorizedCertificates: false,
        },
      });

      expectProxyHit();
    });

    test('should not use http_proxy', async () => {
      await actionTypeWithProxy.executor({
        actionId: 'some-id',
        services,
        config: {},
        secrets: { webhookUrl: 'http://example.com' },
        params: { message: 'this invocation should succeed' },
      });

      expectNoProxyHit();
    });
  });
});
