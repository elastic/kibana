/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SlackService } from './types';
import { api } from './api';

const createMock = (): jest.Mocked<SlackService> => {
  const service = {
    postMessage: jest.fn().mockImplementation(() => ({
      ok: true,
      channel: 'general',
      message: {
        text: 'a message',
        type: 'message',
      },
    })),
    getChannels: jest.fn().mockImplementation(() => [
      {
        ok: true,
        channels: [
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
        ],
      },
    ]),
  };

  return service;
};

const slackServiceMock = {
  create: createMock,
};

describe('api', () => {
  let externalService: jest.Mocked<SlackService>;

  beforeEach(() => {
    externalService = slackServiceMock.create();
  });

  test('getChannels', async () => {
    const res = await api.getChannels({
      externalService,
    });

    expect(res).toEqual([
      {
        channels: [
          {
            id: 'channel_id_1',
            is_archived: false,
            is_channel: true,
            is_private: true,
            name: 'general',
          },
          {
            id: 'channel_id_2',
            is_archived: false,
            is_channel: true,
            is_private: false,
            name: 'privat',
          },
        ],
        ok: true,
      },
    ]);
  });

  test('postMessage', async () => {
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
});
