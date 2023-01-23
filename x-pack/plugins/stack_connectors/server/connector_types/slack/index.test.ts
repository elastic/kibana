/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import {
  Services,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
} from '@kbn/actions-plugin/server/types';
import { validateParams, validateSecrets } from '@kbn/actions-plugin/server/lib';
import { getConnectorType } from '.';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { loggerMock } from '@kbn/logging-mocks';
import type { SlackConnectorType } from '../../../common/slack/types';
import { SLACK_CONNECTOR_ID } from '../../../common/slack/constants';
import { SLACK_CONNECTOR_NAME } from './translations';

jest.mock('@slack/webhook', () => {
  return {
    IncomingWebhook: jest.fn().mockImplementation(() => {
      return { send: (message: string) => {} };
    }),
  };
});

const services: Services = actionsMock.createServices();
const mockedLogger: jest.Mocked<Logger> = loggerMock.create();

let connectorType: SlackConnectorType;
let configurationUtilities: jest.Mocked<ActionsConfigurationUtilities>;

beforeEach(() => {
  configurationUtilities = actionsConfigMock.create();
  connectorType = getConnectorType();
});

describe('connector registration', () => {
  test('returns connector type', () => {
    expect(connectorType.id).toEqual(SLACK_CONNECTOR_ID);
    expect(connectorType.name).toEqual(SLACK_CONNECTOR_NAME);
  });
});

describe('validateParams()', () => {
  test('should validate and pass when params is valid for webhhok type', () => {
    expect(
      validateParams(connectorType, { message: 'a message' }, { configurationUtilities })
    ).toEqual({
      message: 'a message',
    });
  });

  test.only('should validate and pass when params is valid for web_api type', () => {
    expect(
      validateParams(
        connectorType,
        { channels: ['general'], text: 'a text' },
        { configurationUtilities }
      )
    ).toEqual({
      message: 'a text',
    });
  });

  test('should validate and throw error when params is invalid', () => {
    expect(() => {
      validateParams(connectorType, {}, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [message]: expected value of type [string] but got [undefined]"`
    );

    //   expect(() => {
    //     validateParams(connectorType, { message: 1 }, { configurationUtilities });
    //   }).toThrowErrorMatchingInlineSnapshot(
    //     `"error validating action params: [message]: expected value of type [string] but got [number]"`
    //   );
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
    const params = connectorType.renderParameterTemplates!(paramsWithTemplates, variables);
    expect(params.message).toBe('`*bold*`');
  });
});
