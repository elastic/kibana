/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IncomingWebhook } from '@slack/webhook';
import { Logger } from '@kbn/core/server';
import {
  Services,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
  ConnectorUsageCollector,
} from '@kbn/actions-plugin/server/types';
import { validateParams, validateSecrets } from '@kbn/actions-plugin/server/lib';
import {
  getConnectorType,
  SlackConnectorType,
  SlackConnectorTypeExecutorOptions,
  ConnectorTypeId,
} from '.';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { loggerMock } from '@kbn/logging-mocks';
import { TaskErrorSource } from '@kbn/task-manager-plugin/common';

const sendSpy = jest.spyOn(IncomingWebhook.prototype, 'send');

const services: Services = actionsMock.createServices();
const mockedLogger: jest.Mocked<Logger> = loggerMock.create();

let connectorType: SlackConnectorType;
let configurationUtilities: jest.Mocked<ActionsConfigurationUtilities>;
let connectorUsageCollector: ConnectorUsageCollector;

beforeEach(() => {
  configurationUtilities = actionsConfigMock.create();
  connectorType = getConnectorType({
    async executor(options) {
      return { status: 'ok', actionId: options.actionId };
    },
  });
  connectorUsageCollector = new ConnectorUsageCollector({
    logger: mockedLogger,
    connectorId: 'test-connector-id',
  });
});

describe('connector registration', () => {
  test('returns connector type', () => {
    expect(connectorType.id).toEqual(ConnectorTypeId);
    expect(connectorType.name).toEqual('Slack');
  });
});

describe('validateParams()', () => {
  test('should validate and pass when params is valid', () => {
    expect(
      validateParams(connectorType, { message: 'a message' }, { configurationUtilities })
    ).toEqual({
      message: 'a message',
    });
  });

  test('should validate and throw error when params is invalid', () => {
    expect(() => {
      validateParams(connectorType, {}, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [message]: expected value of type [string] but got [undefined]"`
    );

    expect(() => {
      validateParams(connectorType, { message: 1 }, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [message]: expected value of type [string] but got [number]"`
    );
  });
});

describe('validateConnectorTypeSecrets()', () => {
  test('should validate and pass when config is valid', () => {
    validateSecrets(
      connectorType,
      {
        webhookUrl: 'https://example.com',
      },
      { configurationUtilities }
    );
  });

  test('should validate and throw error when config is invalid', () => {
    expect(() => {
      validateSecrets(connectorType, {}, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [webhookUrl]: expected value of type [string] but got [undefined]"`
    );

    expect(() => {
      validateSecrets(connectorType, { webhookUrl: 1 }, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [webhookUrl]: expected value of type [string] but got [number]"`
    );

    expect(() => {
      validateSecrets(connectorType, { webhookUrl: 'fee-fi-fo-fum' }, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: error configuring slack action: unable to parse host name from webhookUrl"`
    );
  });

  test('should validate and pass when the slack webhookUrl is added to allowedHosts', () => {
    const configUtils = {
      ...actionsConfigMock.create(),
      ensureUriAllowed: (url: string) => {
        expect(url).toEqual('https://api.slack.com/');
      },
    };

    expect(
      validateSecrets(
        connectorType,
        { webhookUrl: 'https://api.slack.com/' },
        { configurationUtilities: configUtils }
      )
    ).toEqual({
      webhookUrl: 'https://api.slack.com/',
    });
  });

  test('config validation returns an error if the specified URL isnt added to allowedHosts', () => {
    const configUtils = {
      ...actionsConfigMock.create(),
      ensureUriAllowed: () => {
        throw new Error(`target hostname is not added to allowedHosts`);
      },
    };

    expect(() => {
      validateSecrets(
        connectorType,
        { webhookUrl: 'https://api.slack.com/' },
        { configurationUtilities: configUtils }
      );
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: error configuring slack action: target hostname is not added to allowedHosts"`
    );
  });
});

describe('execute()', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    async function mockSlackExecutor(options: SlackConnectorTypeExecutorOptions) {
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
      } as ConnectorTypeExecutorResult<void>;
    }

    connectorType = getConnectorType({
      executor: mockSlackExecutor,
    });
  });

  test('calls the mock executor with success', async () => {
    const response = await connectorType.executor({
      actionId: 'some-id',
      services,
      config: {},
      secrets: { webhookUrl: 'http://example.com' },
      params: { message: 'this invocation should succeed' },
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    });
    expect(response).toMatchInlineSnapshot(`
      Object {
        "actionId": "",
        "status": "ok",
        "text": "slack mockExecutor success: this invocation should succeed",
      }
    `);
  });

  test('calls the mock executor with failure', async () => {
    await expect(
      connectorType.executor({
        actionId: 'some-id',
        services,
        config: {},
        secrets: { webhookUrl: 'http://example.com' },
        params: { message: 'failure: this invocation should fail' },
        configurationUtilities,
        logger: mockedLogger,
        connectorUsageCollector,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"slack mockExecutor failure: this invocation should fail"`
    );
  });

  test('calls the mock executor with success proxy', async () => {
    const configUtils = actionsConfigMock.create();
    configUtils.getProxySettings.mockReturnValue({
      proxyUrl: 'https://someproxyhost',
      proxySSLSettings: {
        verificationMode: 'none',
      },
      proxyBypassHosts: undefined,
      proxyOnlyHosts: undefined,
    });
    const connectorTypeProxy = getConnectorType({});
    await connectorTypeProxy.executor({
      actionId: 'some-id',
      services,
      config: {},
      secrets: { webhookUrl: 'http://example.com' },
      params: { message: 'this invocation should succeed' },
      configurationUtilities: configUtils,
      logger: mockedLogger,
      connectorUsageCollector,
    });
    expect(mockedLogger.debug).toHaveBeenCalledWith(
      'IncomingWebhook was called with proxyUrl https://someproxyhost'
    );
  });

  test('ensure proxy bypass will bypass when expected', async () => {
    mockedLogger.debug.mockReset();
    const configUtils = actionsConfigMock.create();
    configUtils.getProxySettings.mockReturnValue({
      proxyUrl: 'https://someproxyhost',
      proxySSLSettings: {
        verificationMode: 'none',
      },
      proxyBypassHosts: new Set(['example.com']),
      proxyOnlyHosts: undefined,
    });
    const connectorTypeProxy = getConnectorType({});
    await connectorTypeProxy.executor({
      actionId: 'some-id',
      services,
      config: {},
      secrets: { webhookUrl: 'http://example.com' },
      params: { message: 'this invocation should succeed' },
      configurationUtilities: configUtils,
      logger: mockedLogger,
      connectorUsageCollector,
    });
    expect(mockedLogger.debug).not.toHaveBeenCalledWith(
      'IncomingWebhook was called with proxyUrl https://someproxyhost'
    );
  });

  test('ensure proxy bypass will not bypass when expected', async () => {
    mockedLogger.debug.mockReset();
    const configUtils = actionsConfigMock.create();
    configUtils.getProxySettings.mockReturnValue({
      proxyUrl: 'https://someproxyhost',
      proxySSLSettings: {
        verificationMode: 'none',
      },
      proxyBypassHosts: new Set(['not-example.com']),
      proxyOnlyHosts: undefined,
    });
    const connectorTypeProxy = getConnectorType({});
    await connectorTypeProxy.executor({
      actionId: 'some-id',
      services,
      config: {},
      secrets: { webhookUrl: 'http://example.com' },
      params: { message: 'this invocation should succeed' },
      configurationUtilities: configUtils,
      logger: mockedLogger,
      connectorUsageCollector,
    });
    expect(mockedLogger.debug).toHaveBeenCalledWith(
      'IncomingWebhook was called with proxyUrl https://someproxyhost'
    );
  });

  test('ensure proxy only will proxy when expected', async () => {
    mockedLogger.debug.mockReset();
    const configUtils = actionsConfigMock.create();
    configUtils.getProxySettings.mockReturnValue({
      proxyUrl: 'https://someproxyhost',
      proxySSLSettings: {
        verificationMode: 'none',
      },
      proxyBypassHosts: undefined,
      proxyOnlyHosts: new Set(['example.com']),
    });
    const connectorTypeProxy = getConnectorType({});
    await connectorTypeProxy.executor({
      actionId: 'some-id',
      services,
      config: {},
      secrets: { webhookUrl: 'http://example.com' },
      params: { message: 'this invocation should succeed' },
      configurationUtilities: configUtils,
      logger: mockedLogger,
      connectorUsageCollector,
    });
    expect(mockedLogger.debug).toHaveBeenCalledWith(
      'IncomingWebhook was called with proxyUrl https://someproxyhost'
    );
  });

  test('ensure proxy only will not proxy when expected', async () => {
    mockedLogger.debug.mockReset();
    const configUtils = actionsConfigMock.create();
    configUtils.getProxySettings.mockReturnValue({
      proxyUrl: 'https://someproxyhost',
      proxySSLSettings: {
        verificationMode: 'none',
      },
      proxyBypassHosts: undefined,
      proxyOnlyHosts: new Set(['not-example.com']),
    });
    const connectorTypeProxy = getConnectorType({});
    await connectorTypeProxy.executor({
      actionId: 'some-id',
      services,
      config: {},
      secrets: { webhookUrl: 'http://example.com' },
      params: { message: 'this invocation should succeed' },
      configurationUtilities: configUtils,
      logger: mockedLogger,
      connectorUsageCollector,
    });
    expect(mockedLogger.debug).not.toHaveBeenCalledWith(
      'IncomingWebhook was called with proxyUrl https://someproxyhost'
    );
  });

  test('renders parameter templates as expected', async () => {
    expect(connectorType.renderParameterTemplates).toBeTruthy();
    const paramsWithTemplates = {
      message: '{{rogue}}',
    };
    const variables = {
      rogue: '*bold*',
    };
    const params = connectorType.renderParameterTemplates!(
      mockedLogger,
      paramsWithTemplates,
      variables
    );
    expect(params.message).toBe('`*bold*`');
  });

  test('returns a user error for rate-limiting responses', async () => {
    const configUtils = actionsConfigMock.create();

    configUtils.getProxySettings.mockReturnValue({
      proxyUrl: 'https://someproxyhost',
      proxySSLSettings: {
        verificationMode: 'none',
      },
      proxyBypassHosts: undefined,
      proxyOnlyHosts: undefined,
    });

    sendSpy.mockRejectedValueOnce({
      original: { response: { status: 429, statusText: 'failure', headers: {} } },
    });

    connectorType = getConnectorType({});

    expect(
      await connectorType.executor({
        actionId: 'some-id',
        services,
        config: {},
        secrets: { webhookUrl: 'http://example.com' },
        params: { message: '429' },
        configurationUtilities: configUtils,
        logger: mockedLogger,
        connectorUsageCollector,
      })
    ).toEqual({
      actionId: 'some-id',
      errorSource: TaskErrorSource.USER,
      message: 'error posting a slack message, retry later',
      retry: true,
      status: 'error',
    });
  });
});
