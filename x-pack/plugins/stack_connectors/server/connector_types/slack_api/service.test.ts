/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { request, createAxiosResponse } from '@kbn/actions-plugin/server/lib/axios_utils';
import { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { createExternalService } from './service';
import { SlackApiService } from '../../../common/slack_api/types';
import { SLACK_API_CONNECTOR_ID } from '../../../common/slack_api/constants';

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

jest.mock('axios');
jest.mock('@kbn/actions-plugin/server/lib/axios_utils', () => {
  const originalUtils = jest.requireActual('@kbn/actions-plugin/server/lib/axios_utils');
  return {
    ...originalUtils,
    request: jest.fn(),
  };
});

axios.create = jest.fn(() => axios);
const requestMock = request as jest.Mock;
const configurationUtilities = actionsConfigMock.create();

const channels = [
  {
    id: 'channel_id_1',
    name: 'general',
    is_channel: true,
    is_archived: false,
    is_private: true,
  },
  {
    id: 'channel_id_2',
    name: 'privat',
    is_channel: true,
    is_archived: false,
    is_private: false,
  },
];

const getChannelsResponse = createAxiosResponse({
  data: {
    ok: true,
    channels,
  },
});

const postMessageResponse = createAxiosResponse({
  data: [
    {
      ok: true,
      channel: 'general',
      message: {
        text: 'a message',
        type: 'message',
      },
    },
    {
      ok: true,
      channel: 'privat',
      message: {
        text: 'a message',
        type: 'message',
      },
    },
  ],
});

describe('Slack API service', () => {
  let service: SlackApiService;

  beforeAll(() => {
    service = createExternalService(
      {
        secrets: { token: 'token' },
      },
      logger,
      configurationUtilities
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Secrets validation', () => {
    test('throws without token', () => {
      expect(() =>
        createExternalService(
          {
            secrets: { token: '' },
          },
          logger,
          configurationUtilities
        )
      ).toThrowErrorMatchingInlineSnapshot(`"[Action][Slack API]: Wrong configuration."`);
    });
  });

  describe('getChannels', () => {
    test('should get slack channels', async () => {
      requestMock.mockImplementation(() => getChannelsResponse);
      const res = await service.getChannels();
      expect(res).toEqual({
        actionId: SLACK_API_CONNECTOR_ID,
        data: {
          ok: true,
          channels,
        },
        status: 'ok',
      });
    });

    test('should call request with correct arguments', async () => {
      requestMock.mockImplementation(() => getChannelsResponse);

      await service.getChannels();
      expect(requestMock).toHaveBeenCalledWith({
        axios,
        logger,
        configurationUtilities,
        method: 'get',
        url: 'conversations.list?types=public_channel,private_channel',
      });
    });

    test('should throw an error if request to slack fail', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('request fail');
      });

      expect(await service.getChannels()).toEqual({
        actionId: SLACK_API_CONNECTOR_ID,
        message: 'error posting slack message',
        serviceMessage: 'request fail',
        status: 'error',
      });
    });
  });

  describe('postMessage', () => {
    test('should call request with correct arguments', async () => {
      requestMock.mockImplementation(() => postMessageResponse);

      await service.postMessage({ channels: ['general', 'privat'], text: 'a message' });

      expect(requestMock).toHaveBeenCalledTimes(1);
      expect(requestMock).toHaveBeenNthCalledWith(1, {
        axios,
        logger,
        configurationUtilities,
        method: 'post',
        url: 'chat.postMessage',
        data: { channel: 'general', text: 'a message' },
      });
    });

    test('should throw an error if request to slack fail', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('request fail');
      });

      expect(
        await service.postMessage({ channels: ['general', 'privat'], text: 'a message' })
      ).toEqual({
        actionId: SLACK_API_CONNECTOR_ID,
        message: 'error posting slack message',
        serviceMessage: 'request fail',
        status: 'error',
      });
    });
  });
});
