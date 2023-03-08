/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { Logger } from '@kbn/core/server';
import { Services } from '@kbn/actions-plugin/server/types';
import {
  validateParams,
  validateSecrets,
  validateConnector,
  validateConfig,
} from '@kbn/actions-plugin/server/lib';
import { getConnectorType } from '.';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { loggerMock } from '@kbn/logging-mocks';
import * as utils from '@kbn/actions-plugin/server/lib/axios_utils';
import type { PostMessageParams, SlackConnectorType } from '../../../common/slack/types';
import { SLACK_CONNECTOR_ID } from '../../../common/slack/constants';
import { SLACK_CONNECTOR_NAME } from './translations';

jest.mock('axios');
jest.mock('@kbn/actions-plugin/server/lib/axios_utils', () => {
  const originalUtils = jest.requireActual('@kbn/actions-plugin/server/lib/axios_utils');
  return {
    ...originalUtils,
    request: jest.fn(),
  };
});

const requestMock = utils.request as jest.Mock;

jest.mock('@slack/webhook');
const { IncomingWebhook } = jest.requireMock('@slack/webhook');

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

describe('validate params', () => {
  test('should validate and throw error when params are invalid', () => {
    expect(() => {
      validateParams(connectorType, {}, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: Cannot destructure property 'Symbol(Symbol.iterator)' of 'undefined' as it is undefined."`
    );

    expect(() => {
      validateParams(connectorType, { message: 1 }, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: Cannot destructure property 'Symbol(Symbol.iterator)' of 'undefined' as it is undefined."`
    );
  });

  describe('Webhook', () => {
    test('should validate and pass when params are valid', () => {
      expect(
        validateParams(connectorType, { message: 'a message' }, { configurationUtilities })
      ).toEqual({ message: 'a message' });
    });
  });

  describe('Web API', () => {
    test('should validate and pass when params are valid for post message', () => {
      expect(
        validateParams(
          connectorType,
          { subAction: 'postMessage', subActionParams: { channels: ['general'], text: 'a text' } },
          { configurationUtilities }
        )
      ).toEqual({
        subAction: 'postMessage',
        subActionParams: { channels: ['general'], text: 'a text' },
      });
    });

    test('should validate and pass when params are valid for get channels', () => {
      expect(
        validateParams(connectorType, { subAction: 'getChannels' }, { configurationUtilities })
      ).toEqual({
        subAction: 'getChannels',
      });
    });
  });
});

describe('validate config, secrets and connector', () => {
  test('should validate and throw error when secrets is invalid', () => {
    expect(() => {
      validateSecrets(connectorType, {}, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(`
      "error validating action type secrets: types that failed validation:
      - [0.webhookUrl]: expected value of type [string] but got [undefined]
      - [1.token]: expected value of type [string] but got [undefined]"
    `);
  });

  test('should validate and pass when config is valid', () => {
    validateConfig(connectorType, { type: 'web_api' }, { configurationUtilities });
  });

  test('should validate and pass when config is empty', () => {
    validateConfig(connectorType, {}, { configurationUtilities });
  });

  test('should fail when config is invalid', () => {
    expect(() => {
      validateConfig(connectorType, { type: 'not_webhook' }, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(`
      "error validating action type config: [type]: types that failed validation:
      - [type.0]: expected value to equal [webhook]
      - [type.1]: expected value to equal [web_api]"
    `);
  });

  describe('Webhook', () => {
    test('should validate and pass when config and secrets are invalid together', () => {
      expect(() => {
        validateConnector(connectorType, {
          config: { type: 'webhook' },
          secrets: { token: 'fake_token' },
        });
      }).toThrowErrorMatchingInlineSnapshot(
        `"error validating action type connector: Secrets of Slack type webhook should contain webhookUrl field"`
      );
    });

    test('should validate and pass when secrets is valid', () => {
      validateSecrets(
        connectorType,
        { webhookUrl: 'https://example.com' },
        { configurationUtilities }
      );
    });

    test('should validate and pass when the slack webhookUrl is added to allowedHosts', () => {
      const configUtils = {
        ...actionsConfigMock.create(),
        ensureUriAllowed: (url: string) => {
          expect(url).toEqual('https://api.slack.com/');
        },
      };
      actionsConfigMock.create();
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

    test('should validate and throw error when secrets is invalid', () => {
      expect(() => {
        validateSecrets(connectorType, { webhookUrl: 1 }, { configurationUtilities });
      }).toThrowErrorMatchingInlineSnapshot(`
        "error validating action type secrets: types that failed validation:
        - [0.webhookUrl]: expected value of type [string] but got [number]
        - [1.token]: expected value of type [string] but got [undefined]"
      `);

      expect(() => {
        validateSecrets(connectorType, { webhookUrl: 'fee-fi-fo-fum' }, { configurationUtilities });
      }).toThrowErrorMatchingInlineSnapshot(
        `"error validating action type secrets: error configuring slack action: unable to parse host name from webhookUrl"`
      );
    });
  });

  describe('Web API', () => {
    test('should fail when config and secrets are invalid together', () => {
      expect(() => {
        validateConnector(connectorType, {
          config: { type: 'web_api' },
          secrets: { webhookUrl: 'https://fake_url' },
        });
      }).toThrowErrorMatchingInlineSnapshot(
        `"error validating action type connector: Secrets of Slack type web_api should contain token field"`
      );
    });

    test('should validate and pass when secrets is valid', () => {
      validateSecrets(
        connectorType,
        {
          token: 'token',
        },
        { configurationUtilities }
      );
    });

    test('should validate and throw error when secrets is invalid', () => {
      expect(() => {
        validateSecrets(connectorType, { token: 1 }, { configurationUtilities });
      }).toThrowErrorMatchingInlineSnapshot(`
        "error validating action type secrets: types that failed validation:
        - [0.webhookUrl]: expected value of type [string] but got [undefined]
        - [1.token]: expected value of type [string] but got [number]"
      `);
    });
  });
});

describe('execute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    axios.create = jest.fn().mockImplementation(() => axios);
    connectorType = getConnectorType();
  });
  describe('Webhook', () => {
    test('should fail if type is webhook, but params does not include message', async () => {
      jest.mock('@kbn/actions-plugin/server/lib/get_custom_agents', () => ({
        getCustomAgents: () => ({ httpsAgent: jest.fn(), httpAgent: jest.fn() }),
      }));
      configurationUtilities = actionsConfigMock.create();
      IncomingWebhook.mockImplementation(() => ({
        send: () => ({
          text: 'ok',
        }),
      }));

      await expect(
        connectorType.executor({
          actionId: '.slack',
          services,
          config: { type: 'webhook' },
          secrets: { webhookUrl: 'http://example.com' },
          params: { subAction: 'getChannels' },
          configurationUtilities,
          logger: mockedLogger,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Slack connector parameters with type Webhook should include message field in parameters"`
      );
    });

    test('should execute with success', async () => {
      jest.mock('@kbn/actions-plugin/server/lib/get_custom_agents', () => ({
        getCustomAgents: () => ({ httpsAgent: jest.fn(), httpAgent: jest.fn() }),
      }));
      configurationUtilities = actionsConfigMock.create();
      IncomingWebhook.mockImplementation(() => ({
        send: () => ({
          text: 'ok',
        }),
      }));
      const response = await connectorType.executor({
        actionId: '.slack',
        services,
        config: { type: 'webhook' },
        secrets: { webhookUrl: 'http://example.com' },
        params: { message: 'this invocation should succeed' },
        configurationUtilities,
        logger: mockedLogger,
      });

      expect(response).toEqual({
        actionId: '.slack',
        data: { text: 'ok' },
        status: 'ok',
      });
    });

    test('should return an error if test in response is not ok', async () => {
      jest.mock('@kbn/actions-plugin/server/lib/get_custom_agents', () => ({
        getCustomAgents: () => ({ httpsAgent: jest.fn(), httpAgent: jest.fn() }),
      }));
      configurationUtilities = actionsConfigMock.create();
      IncomingWebhook.mockImplementation(() => ({
        send: () => ({
          text: 'not ok',
        }),
      }));
      const response = await connectorType.executor({
        actionId: '.slack',
        services,
        config: { type: 'webhook' },
        secrets: { webhookUrl: 'http://example.com' },
        params: { message: 'this invocation should succeed' },
        configurationUtilities,
        logger: mockedLogger,
      });

      expect(response).toEqual({
        actionId: '.slack',
        message: 'error posting slack message',
        serviceMessage: 'not ok',
        status: 'error',
      });
    });

    test('should return a null response from slack', async () => {
      jest.mock('@kbn/actions-plugin/server/lib/get_custom_agents', () => ({
        getCustomAgents: () => ({ httpsAgent: jest.fn(), httpAgent: jest.fn() }),
      }));
      configurationUtilities = actionsConfigMock.create();
      IncomingWebhook.mockImplementation(() => ({
        send: jest.fn(),
      }));
      const response = await connectorType.executor({
        actionId: '.slack',
        services,
        config: { type: 'webhook' },
        secrets: { webhookUrl: 'http://example.com' },
        params: { message: 'this invocation should succeed' },
        configurationUtilities,
        logger: mockedLogger,
      });

      expect(response).toEqual({
        actionId: '.slack',
        message: 'unexpected null response from slack',
        status: 'error',
      });
    });

    test('should return that sending a message fails', async () => {
      jest.mock('@kbn/actions-plugin/server/lib/get_custom_agents', () => ({
        getCustomAgents: () => ({ httpsAgent: jest.fn(), httpAgent: jest.fn() }),
      }));
      configurationUtilities = actionsConfigMock.create();
      IncomingWebhook.mockImplementation(() => ({
        send: () => {
          throw new Error('sending a message fails');
        },
      }));

      expect(
        await connectorType.executor({
          actionId: '.slack',
          services,
          config: { type: 'webhook' },
          secrets: { webhookUrl: 'http://example.com' },
          params: { message: 'failure: this invocation should fail' },
          configurationUtilities,
          logger: mockedLogger,
        })
      ).toEqual({
        actionId: '.slack',
        message: 'error posting slack message',
        serviceMessage: 'sending a message fails',
        status: 'error',
      });
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
      const connectorTypeProxy = getConnectorType();
      await connectorTypeProxy.executor({
        actionId: '.slack',
        services,
        config: { type: 'webhook' },
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
      const connectorTypeProxy = getConnectorType();
      await connectorTypeProxy.executor({
        actionId: '.slack',
        services,
        config: { type: 'webhook' },
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
      const connectorTypeProxy = getConnectorType();
      await connectorTypeProxy.executor({
        actionId: '.slack',
        services,
        config: { type: 'webhook' },
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
      const connectorTypeProxy = getConnectorType();
      await connectorTypeProxy.executor({
        actionId: '.slack',
        services,
        config: { type: 'webhook' },
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
      const connectorTypeProxy = getConnectorType();
      await connectorTypeProxy.executor({
        actionId: '.slack',
        services,
        config: { type: 'webhook' },
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
      const params = connectorType.renderParameterTemplates!(paramsWithTemplates, variables) as {
        message: string;
      };
      expect(params.message).toBe('`*bold*`');
    });
  });

  describe('Web API', () => {
    test('should fail if type is web_api, but params does not include subAction', async () => {
      requestMock.mockImplementation(() => ({
        data: {
          ok: true,
          message: { text: 'some text' },
          channel: 'general',
        },
      }));

      await expect(
        connectorType.executor({
          actionId: '.slack',
          services,
          config: { type: 'web_api' },
          secrets: { token: 'some token' },
          params: {
            message: 'post message',
          },
          configurationUtilities,
          logger: mockedLogger,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Slack connector parameters with type Web API should include subAction field in parameters"`
      );
    });

    test('should fail if type is web_api, but subAction is not postMessage/getChannels', async () => {
      requestMock.mockImplementation(() => ({
        data: {
          ok: true,
          message: { text: 'some text' },
          channel: 'general',
        },
      }));

      await expect(
        connectorType.executor({
          actionId: '.slack',
          services,
          config: { type: 'web_api' },
          secrets: { token: 'some token' },
          params: {
            subAction: 'getMessage' as 'getChannels',
          },
          configurationUtilities,
          logger: mockedLogger,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"subAction can be only postMesage or getChannels"`
      );
    });

    test('renders parameter templates as expected', async () => {
      expect(connectorType.renderParameterTemplates).toBeTruthy();
      const paramsWithTemplates = {
        subAction: 'postMessage' as const,
        subActionParams: { text: 'some text', channels: ['general'] },
      };
      const variables = { rogue: '*bold*' };
      const params = connectorType.renderParameterTemplates!(
        paramsWithTemplates,
        variables
      ) as PostMessageParams;
      expect(params.subActionParams.text).toBe('some text');
    });

    test('should execute with success for post message', async () => {
      requestMock.mockImplementation(() => ({
        data: {
          ok: true,
          message: { text: 'some text' },
          channel: 'general',
        },
      }));

      const response = await connectorType.executor({
        actionId: '.slack',
        services,
        config: { type: 'web_api' },
        secrets: { token: 'some token' },
        params: {
          subAction: 'postMessage',
          subActionParams: { channels: ['general'], text: 'some text' },
        },
        configurationUtilities,
        logger: mockedLogger,
      });

      expect(requestMock).toHaveBeenCalledWith({
        axios,
        configurationUtilities,
        logger: mockedLogger,
        method: 'post',
        url: 'chat.postMessage',
        data: { channel: 'general', text: 'some text' },
      });

      expect(response).toEqual({
        actionId: '.slack',
        data: {
          channel: 'general',
          message: {
            text: 'some text',
          },
          ok: true,
        },

        status: 'ok',
      });
    });

    test('should execute with success for get channels', async () => {
      requestMock.mockImplementation(() => ({
        data: {
          ok: true,
          channels: [
            {
              id: 'id',
              name: 'general',
              is_channel: true,
              is_archived: false,
              is_private: true,
            },
          ],
        },
      }));
      const response = await connectorType.executor({
        actionId: '.slack',
        services,
        config: { type: 'web_api' },
        secrets: { token: 'some token' },
        params: {
          subAction: 'getChannels',
        },
        configurationUtilities,
        logger: mockedLogger,
      });

      expect(requestMock).toHaveBeenCalledWith({
        axios,
        configurationUtilities,
        logger: mockedLogger,
        method: 'get',
        url: 'conversations.list?types=public_channel,private_channel',
      });

      expect(response).toEqual({
        actionId: '.slack',
        data: {
          channels: [
            {
              id: 'id',
              is_archived: false,
              is_channel: true,
              is_private: true,
              name: 'general',
            },
          ],
          ok: true,
        },
        status: 'ok',
      });
    });
  });
});
