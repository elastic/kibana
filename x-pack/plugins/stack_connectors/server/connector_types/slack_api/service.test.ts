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

const channel = {
  id: 'channel_id_1',
  name: 'general',
  is_channel: true,
  is_archived: false,
  is_private: true,
};

const testBlock = {
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: "Hello, Assistant to the Regional Manager Dwight! *Michael Scott* wants to know where you'd like to take the Paper Company investors to dinner tonight.\n",
      },
    },
  ],
};

const getValidChannelIdResponse = createAxiosResponse({
  data: {
    ok: true,
    channel,
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

const postBlockkitResponse = createAxiosResponse({
  data: {
    bot_id: 'B06AMU52C9E',
    type: 'message',
    text: "Hello, Assistant to the Regional Manager Dwight! *Michael Scott* wants to know where you'd like to take the Paper Company investors to dinner tonight.\n",
    user: 'U069W74U6A1',
    ts: '1704383852.003159',
    app_id: 'A069Z4WDFEW',
    blocks: [
      {
        type: 'section',
        block_id: 'sDltQ',
        text: {
          type: 'mrkdwn',
          text: "Hello, Assistant to the Regional Manager Dwight! *Michael Scott* wants to know where you'd like to take the Paper Company investors to dinner tonight.\n",
          verbatim: false,
        },
      },
    ],
    team: 'TC0AARLHE',
    bot_profile: {
      id: 'B06AMU52C9E',
      app_id: 'A069Z4WDFEW',
      name: 'test slack web api',
      icons: {
        image_36: 'https://a.slack-edge.com/80588/img/plugins/app/bot_36.png',
        image_48: 'https://a.slack-edge.com/80588/img/plugins/app/bot_48.png',
        image_72: 'https://a.slack-edge.com/80588/img/plugins/app/service_72.png',
      },
      deleted: false,
      updated: 1702475971,
      team_id: 'TC0AARLHE',
    },
  },
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

  describe('validChannelId', () => {
    test('should get slack channels', async () => {
      requestMock.mockImplementation(() => getValidChannelIdResponse);
      const res = await service.validChannelId('channel_id_1');
      expect(res).toEqual({
        actionId: SLACK_API_CONNECTOR_ID,
        data: {
          ok: true,
          channel,
        },
        status: 'ok',
      });
    });

    test('should call request with correct arguments', async () => {
      requestMock.mockImplementation(() => getValidChannelIdResponse);

      await service.validChannelId('channel_id_1');
      expect(requestMock).toHaveBeenCalledWith({
        axios,
        headers: {
          Authorization: 'Bearer token',
          'Content-type': 'application/json; charset=UTF-8',
        },
        logger,
        configurationUtilities,
        method: 'get',
        url: 'https://slack.com/api/conversations.info?channel=channel_id_1',
      });
    });

    test('should throw an error if request to slack fail', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('request fail');
      });

      expect(await service.validChannelId('channel_id_1')).toEqual({
        actionId: SLACK_API_CONNECTOR_ID,
        message: 'error posting slack message',
        serviceMessage: 'request fail',
        status: 'error',
      });
    });
  });

  describe('postMessage', () => {
    test('should call request with only channels argument', async () => {
      requestMock.mockImplementation(() => postMessageResponse);

      await service.postMessage({ channels: ['general', 'privat'], text: 'a message' });

      expect(requestMock).toHaveBeenCalledTimes(1);
      expect(requestMock).toHaveBeenNthCalledWith(1, {
        axios,
        headers: {
          Authorization: 'Bearer token',
          'Content-type': 'application/json; charset=UTF-8',
        },
        logger,
        configurationUtilities,
        method: 'post',
        url: 'https://slack.com/api/chat.postMessage',
        data: { channel: 'general', text: 'a message' },
      });
    });

    test('should call request with only channelIds argument', async () => {
      requestMock.mockImplementation(() => postMessageResponse);

      await service.postMessage({
        channels: ['general', 'privat'],
        channelIds: ['QWEERTYU987', 'POIUYT123'],
        text: 'a message',
      });

      expect(requestMock).toHaveBeenCalledTimes(1);
      expect(requestMock).toHaveBeenNthCalledWith(1, {
        axios,
        headers: {
          Authorization: 'Bearer token',
          'Content-type': 'application/json; charset=UTF-8',
        },
        logger,
        configurationUtilities,
        method: 'post',
        url: 'https://slack.com/api/chat.postMessage',
        data: { channel: 'QWEERTYU987', text: 'a message' },
      });
    });

    test('should call request with channels && channelIds  argument', async () => {
      requestMock.mockImplementation(() => postMessageResponse);

      await service.postMessage({ channelIds: ['QWEERTYU987', 'POIUYT123'], text: 'a message' });

      expect(requestMock).toHaveBeenCalledTimes(1);
      expect(requestMock).toHaveBeenNthCalledWith(1, {
        axios,
        logger,
        headers: {
          Authorization: 'Bearer token',
          'Content-type': 'application/json; charset=UTF-8',
        },
        configurationUtilities,
        method: 'post',
        url: 'https://slack.com/api/chat.postMessage',
        data: { channel: 'QWEERTYU987', text: 'a message' },
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

  describe('postBlockkit', () => {
    test('should call request with only channels argument', async () => {
      requestMock.mockImplementation(() => postBlockkitResponse);

      await service.postBlockkit({
        channels: ['general', 'private'],
        text: JSON.stringify(testBlock),
      });

      expect(requestMock).toHaveBeenCalledTimes(1);
      expect(requestMock).toHaveBeenNthCalledWith(1, {
        axios,
        headers: {
          Authorization: 'Bearer token',
          'Content-type': 'application/json; charset=UTF-8',
        },
        logger,
        configurationUtilities,
        method: 'post',
        url: 'https://slack.com/api/chat.postMessage',
        data: { channel: 'general', blocks: testBlock.blocks },
      });
    });

    test('should call request with channels && channelIds  argument', async () => {
      requestMock.mockImplementation(() => postBlockkitResponse);

      await service.postBlockkit({
        channels: ['general', 'private'],
        channelIds: ['QWEERTYU987', 'POIUYT123'],
        text: JSON.stringify(testBlock),
      });

      expect(requestMock).toHaveBeenCalledTimes(1);
      expect(requestMock).toHaveBeenNthCalledWith(1, {
        axios,
        headers: {
          Authorization: 'Bearer token',
          'Content-type': 'application/json; charset=UTF-8',
        },
        logger,
        configurationUtilities,
        method: 'post',
        url: 'https://slack.com/api/chat.postMessage',
        data: { channel: 'QWEERTYU987', blocks: testBlock.blocks },
      });
    });

    test('should call request with only channelIds argument', async () => {
      requestMock.mockImplementation(() => postBlockkitResponse);

      await service.postBlockkit({
        channelIds: ['QWEERTYU987', 'POIUYT123'],
        text: JSON.stringify(testBlock),
      });

      expect(requestMock).toHaveBeenCalledTimes(1);
      expect(requestMock).toHaveBeenNthCalledWith(1, {
        axios,
        logger,
        headers: {
          Authorization: 'Bearer token',
          'Content-type': 'application/json; charset=UTF-8',
        },
        configurationUtilities,
        method: 'post',
        url: 'https://slack.com/api/chat.postMessage',
        data: { channel: 'QWEERTYU987', blocks: testBlock.blocks },
      });
    });

    test('should throw an error if text is invalid JSON', async () => {
      expect(
        await service.postBlockkit({
          channelIds: ['QWEERTYU987', 'POIUYT123'],
          text: 'abc',
        })
      ).toEqual({
        actionId: SLACK_API_CONNECTOR_ID,
        message: 'error posting slack message',
        serviceMessage: 'Unexpected token \'a\', "abc" is not valid JSON',
        status: 'error',
      });
    });

    test('should throw an error if request to slack fails', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('request fail');
      });

      expect(
        await service.postBlockkit({
          channelIds: ['QWEERTYU987', 'POIUYT123'],
          text: JSON.stringify(testBlock),
        })
      ).toEqual({
        actionId: SLACK_API_CONNECTOR_ID,
        message: 'error posting slack message',
        serviceMessage: 'request fail',
        status: 'error',
      });
    });
  });
});
