/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SlackApiService } from '../../../common/slack_api/types';
import { api } from './api';

const createMock = (): jest.Mocked<SlackApiService> => {
  const service = {
    postMessage: jest.fn().mockImplementation(() => ({
      ok: true,
      channel: 'general',
      message: {
        text: 'a message',
        type: 'message',
      },
    })),
    postBlockkit: jest.fn().mockImplementation(() => ({
      ok: true,
      channel: 'general',
      message: {
        text: 'a blockkit message',
      },
    })),
    validChannelId: jest.fn().mockImplementation(() => [
      {
        ok: true,
        channels: {
          id: 'channel_id_1',
          name: 'general',
          is_channel: true,
          is_archived: false,
          is_private: true,
        },
      },
    ]),
  };

  return service;
};

const slackServiceMock = {
  create: createMock,
};

describe('api', () => {
  let externalService: jest.Mocked<SlackApiService>;

  beforeEach(() => {
    externalService = slackServiceMock.create();
  });

  test('validChannelId', async () => {
    const res = await api.validChannelId({
      externalService,
      params: { channelId: 'channel_id_1' },
    });

    expect(res).toEqual([
      {
        channels: {
          id: 'channel_id_1',
          is_archived: false,
          is_channel: true,
          is_private: true,
          name: 'general',
        },

        ok: true,
      },
    ]);
  });

  test('postMessage with channels params', async () => {
    const res = await api.postMessage({
      externalService,
      params: { channels: ['general'], text: 'a message' },
    });

    expect(res).toEqual({
      channel: 'general',
      message: {
        text: 'a message',
        type: 'message',
      },
      ok: true,
    });
  });

  test('postMessage with channelIds params', async () => {
    const res = await api.postMessage({
      externalService,
      params: { channelIds: ['general'], text: 'a message' },
    });

    expect(res).toEqual({
      channel: 'general',
      message: {
        text: 'a message',
        type: 'message',
      },
      ok: true,
    });
  });

  test('postBlockkit with channelIds params', async () => {
    const res = await api.postBlockkit({
      externalService,
      params: { channelIds: ['general'], text: 'a blockkit message' },
    });

    expect(res).toEqual({
      channel: 'general',
      message: {
        text: 'a blockkit message',
      },
      ok: true,
    });
  });
});
