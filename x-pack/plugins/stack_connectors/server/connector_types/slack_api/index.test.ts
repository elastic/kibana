/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { Logger } from '@kbn/core/server';
import { Services } from '@kbn/actions-plugin/server/types';
import { validateConfig, validateParams, validateSecrets } from '@kbn/actions-plugin/server/lib';
import { getConnectorType } from '.';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { loggerMock } from '@kbn/logging-mocks';
import * as utils from '@kbn/actions-plugin/server/lib/axios_utils';
import type { PostMessageParams, SlackApiConnectorType } from '../../../common/slack_api/types';
import { SLACK_API_CONNECTOR_ID } from '../../../common/slack_api/constants';
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

const services: Services = actionsMock.createServices();
const mockedLogger: jest.Mocked<Logger> = loggerMock.create();
const headers = {
  Authorization: 'Bearer some token',
  'Content-type': 'application/json; charset=UTF-8',
};

let connectorType: SlackApiConnectorType;
let configurationUtilities: jest.Mocked<ActionsConfigurationUtilities>;

beforeEach(() => {
  configurationUtilities = actionsConfigMock.create();
  connectorType = getConnectorType();
});

describe('connector registration', () => {
  test('returns connector type', () => {
    expect(connectorType.id).toEqual(SLACK_API_CONNECTOR_ID);
    expect(connectorType.name).toEqual(SLACK_CONNECTOR_NAME);
  });
});

describe('validate config', () => {
  test('should throw error when config are invalid', () => {
    expect(() => {
      validateConfig(connectorType, { message: 1 }, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [message]: definition for this key is missing"`
    );
  });

  test('should validate when config are valid', () => {
    expect(() => {
      validateConfig(connectorType, {}, { configurationUtilities });
    }).not.toThrow();
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

  test('should validate and pass when channels is used as a valid params for post message', () => {
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

  test('should validate and pass when channelIds is used as a valid params for post message', () => {
    expect(
      validateParams(
        connectorType,
        {
          subAction: 'postMessage',
          subActionParams: { channelIds: ['LKJHGF345'], text: 'a text' },
        },
        { configurationUtilities }
      )
    ).toEqual({
      subAction: 'postMessage',
      subActionParams: { channelIds: ['LKJHGF345'], text: 'a text' },
    });
  });

  test('should validate and pass when params are valid for validChannelIds', () => {
    expect(
      validateParams(
        connectorType,
        { subAction: 'validChannelId', subActionParams: { channelId: 'KJHGFD867' } },
        { configurationUtilities }
      )
    ).toEqual({
      subAction: 'validChannelId',
      subActionParams: { channelId: 'KJHGFD867' },
    });
  });
});

describe('validate secrets', () => {
  test('should validate and throw error when secrets is empty', () => {
    expect(() => {
      validateSecrets(connectorType, {}, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [token]: expected value of type [string] but got [undefined]"`
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
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [token]: expected value of type [string] but got [number]"`
    );
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
        { token: 'fake token' },
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

  test('should fail if params does not include subAction', async () => {
    requestMock.mockImplementation(() => ({
      data: {
        ok: true,
        message: { text: 'some text' },
        channel: 'general',
      },
    }));

    await expect(
      connectorType.executor({
        actionId: SLACK_API_CONNECTOR_ID,
        config: {},
        services,
        secrets: { token: 'some token' },
        params: {} as PostMessageParams,
        configurationUtilities,
        logger: mockedLogger,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"[Action][ExternalService] -> [Slack API] Unsupported subAction type undefined."`
    );
  });

  test('should fail if subAction is not postMessage/validChannelId', async () => {
    requestMock.mockImplementation(() => ({
      data: {
        ok: true,
        message: { text: 'some text' },
        channel: 'general',
      },
    }));

    await expect(
      connectorType.executor({
        actionId: SLACK_API_CONNECTOR_ID,
        services,
        config: {},
        secrets: { token: 'some token' },
        params: {
          subAction: 'getMessage' as 'validChannelId',
          subActionParams: {},
        },
        configurationUtilities,
        logger: mockedLogger,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"[Action][ExternalService] -> [Slack API] Unsupported subAction type getMessage."`
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
      actionId: SLACK_API_CONNECTOR_ID,
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
      headers,
      logger: mockedLogger,
      method: 'post',
      url: 'https://slack.com/api/chat.postMessage',
      data: { channel: 'general', text: 'some text' },
    });

    expect(response).toEqual({
      actionId: SLACK_API_CONNECTOR_ID,
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

  test('should execute with success for validChannelId', async () => {
    requestMock.mockImplementation(() => ({
      data: {
        ok: true,
        channel: {
          id: 'ZXCVBNM567',
          name: 'general',
          is_channel: true,
          is_archived: false,
          is_private: true,
        },
      },
    }));
    const response = await connectorType.executor({
      actionId: SLACK_API_CONNECTOR_ID,
      services,
      config: {},
      secrets: { token: 'some token' },
      params: {
        subAction: 'validChannelId',
        subActionParams: {
          channelId: 'ZXCVBNM567',
        },
      },
      configurationUtilities,
      logger: mockedLogger,
    });

    expect(requestMock).toHaveBeenCalledWith({
      axios,
      configurationUtilities,
      headers,
      logger: mockedLogger,
      method: 'get',
      url: 'https://slack.com/api/conversations.info?channel=ZXCVBNM567',
    });

    expect(response).toEqual({
      actionId: SLACK_API_CONNECTOR_ID,
      data: {
        channel: {
          id: 'ZXCVBNM567',
          is_archived: false,
          is_channel: true,
          is_private: true,
          name: 'general',
        },
        ok: true,
      },
      status: 'ok',
    });
  });
});
