/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { Logger } from '@kbn/core/server';
import { Services } from '@kbn/actions-plugin/server/types';
import { validateParams, validateSecrets } from '@kbn/actions-plugin/server/lib';
import { getConnectorType } from '.';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { loggerMock } from '@kbn/logging-mocks';
import * as utils from '@kbn/actions-plugin/server/lib/axios_utils';
import type {
  ExecutorPostMessageParams,
  PostMessageParams,
  SlackConnectorType,
} from '../../../common/slack/types';
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
        validateParams(
          connectorType,
          { subAction: 'getChannels', subActionParams: {} },
          { configurationUtilities }
        )
      ).toEqual({
        subAction: 'getChannels',
        subActionParams: {},
      });
    });
  });
});

describe('validateConnectorTypeSecrets', () => {
  test('should validate and throw error when config is invalid', () => {
    expect(() => {
      validateSecrets(connectorType, {}, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(`
      "error validating action type secrets: types that failed validation:
      - [0.webhookUrl]: expected value of type [string] but got [undefined]
      - [1.token]: expected value of type [string] but got [undefined]"
    `);
  });

  describe('Webhook', () => {
    test('should validate and pass when config is valid', () => {
      validateSecrets(
        connectorType,
        { webhookUrl: 'https://example.com' },
        { configurationUtilities }
      );
    });

    test('should validate and throw error when config is invalid', () => {
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
    test('should validate and pass when config is valid 2', () => {
      validateSecrets(
        connectorType,
        {
          token: 'token',
        },
        { configurationUtilities }
      );
    });

    test('should validate and throw error when config is invalid', () => {
      expect(() => {
        validateSecrets(connectorType, { token: 1 }, { configurationUtilities });
      }).toThrowErrorMatchingInlineSnapshot(`
        "error validating action type secrets: types that failed validation:
        - [0.webhookUrl]: expected value of type [string] but got [undefined]
        - [1.token]: expected value of type [string] but got [number]"
      `);
    });
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
});

describe('execute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    axios.create = jest.fn().mockImplementation(() => axios);
    connectorType = getConnectorType();
  });
  describe('Webhook', () => {
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
        actionId: 'some-id',
        services,
        config: {},
        secrets: { webhookUrl: 'http://example.com' },
        params: { message: 'this invocation should succeed' },
        configurationUtilities,
        logger: mockedLogger,
      });

      expect(response).toEqual({
        actionId: 'some-id',
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
        actionId: 'some-id',
        services,
        config: {},
        secrets: { webhookUrl: 'http://example.com' },
        params: { message: 'this invocation should succeed' },
        configurationUtilities,
        logger: mockedLogger,
      });

      expect(response).toEqual({
        actionId: 'some-id',
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
        actionId: 'some-id',
        services,
        config: {},
        secrets: { webhookUrl: 'http://example.com' },
        params: { message: 'this invocation should succeed' },
        configurationUtilities,
        logger: mockedLogger,
      });

      expect(response).toEqual({
        actionId: 'some-id',
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
          actionId: 'some-id',
          services,
          config: {},
          secrets: { webhookUrl: 'http://example.com' },
          params: { message: 'failure: this invocation should fail' },
          configurationUtilities,
          logger: mockedLogger,
        })
      ).toEqual({
        actionId: 'some-id',
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
      const connectorTypeProxy = getConnectorType();
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
      const connectorTypeProxy = getConnectorType();
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
      const connectorTypeProxy = getConnectorType();
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
      const connectorTypeProxy = getConnectorType();
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
      const params = connectorType.renderParameterTemplates!(paramsWithTemplates, variables) as {
        message: string;
      };
      expect(params.message).toBe('`*bold*`');
    });
  });

  describe('Web API', () => {
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
      ) as ExecutorPostMessageParams;
      expect(params.subActionParams.text).toBe('some text');
    });

    test('should execute with success for post message', async () => {
      requestMock.mockImplementation(() => ({
        data: {
          ok: true,
          data: { text: 'some text' },
          channel: 'general',
        },
      }));
      const response = await connectorType.executor({
        actionId: 'some-id',
        services,
        config: {},
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
        actionId: 'some-id',
        data: [
          {
            channel: 'general',
            data: {
              text: 'some text',
            },
            ok: true,
          },
        ],
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
        actionId: 'some-id',
        services,
        config: {},
        secrets: { token: 'some token' },
        params: {
          subAction: 'getChannels',
          subActionParams: {},
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
        actionId: 'some-id',
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

    test('should fail if subAction is not known', async () => {
      await expect(
        connectorType.executor({
          actionId: 'some-id',
          services,
          config: {},
          secrets: { token: 'some token' },
          params: {
            subAction: 'weirdAcrion' as 'postMessage',
            subActionParams: {} as PostMessageParams,
          },
          configurationUtilities,
          logger: mockedLogger,
        })
      ).rejects.toThrowError('[Action][ExternalService] Unsupported subAction type weirdAcrion.');
    });
  });
});
