/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  RULES_SETTINGS_FEATURE_ID,
  RULES_SETTINGS_SAVED_OBJECT_TYPE,
  RULES_SETTINGS_SAVED_OBJECT_ID,
  DEFAULT_FLAPPING_SETTINGS,
  RulesSettings,
  DEFAULT_QUERY_DELAY_SETTINGS,
} from '../../../common';
import {
  RulesSettingsQueryDelayClient,
  RulesSettingsQueryDelayClientConstructorOptions,
} from './rules_settings_query_delay_client';

const mockDateString = '2019-02-12T21:01:22.479Z';

const savedObjectsClient = savedObjectsClientMock.create();

const getMockRulesSettings = (): RulesSettings => {
  return {
    flapping: {
      enabled: DEFAULT_FLAPPING_SETTINGS.enabled,
      lookBackWindow: DEFAULT_FLAPPING_SETTINGS.lookBackWindow,
      statusChangeThreshold: DEFAULT_FLAPPING_SETTINGS.statusChangeThreshold,
      createdBy: 'test name',
      createdAt: '2023-03-24T00:00:00.000Z',
      updatedBy: 'test name',
      updatedAt: '2023-03-24T00:00:00.000Z',
    },
    queryDelay: {
      delay: DEFAULT_QUERY_DELAY_SETTINGS.delay,
      createdBy: 'test name',
      updatedBy: 'test name',
      createdAt: '2023-03-24T00:00:00.000Z',
      updatedAt: '2023-03-24T00:00:00.000Z',
    },
  };
};

const rulesSettingsQueryDelayClientParams: jest.Mocked<RulesSettingsQueryDelayClientConstructorOptions> =
  {
    logger: loggingSystemMock.create().get(),
    getOrCreate: jest.fn().mockReturnValue({
      id: RULES_SETTINGS_FEATURE_ID,
      type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
      attributes: getMockRulesSettings(),
      references: [],
      version: '123',
    }),
    getModificationMetadata: jest.fn(),
    savedObjectsClient,
  };

const updatedMetadata = {
  createdAt: '2023-03-26T00:00:00.000Z',
  updatedAt: '2023-03-26T00:00:00.000Z',
  createdBy: 'updated-user',
  updatedBy: 'updated-user',
};

describe('RulesSettingsQueryDelayClient', () => {
  beforeEach(() =>
    rulesSettingsQueryDelayClientParams.getModificationMetadata.mockResolvedValue(updatedMetadata)
  );
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(mockDateString));
  });

  afterAll(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('can get query delay settings', async () => {
    const client = new RulesSettingsQueryDelayClient(rulesSettingsQueryDelayClientParams);
    const result = await client.get();

    expect(result).toEqual(
      expect.objectContaining({
        delay: DEFAULT_QUERY_DELAY_SETTINGS.delay,
        createdBy: 'test name',
        updatedBy: 'test name',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    );
  });

  test('can update query delay settings', async () => {
    const client = new RulesSettingsQueryDelayClient(rulesSettingsQueryDelayClientParams);

    const mockResolve = {
      id: RULES_SETTINGS_FEATURE_ID,
      type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
      attributes: getMockRulesSettings(),
      references: [],
      version: '123',
    };

    savedObjectsClient.update.mockResolvedValueOnce({
      ...mockResolve,
      attributes: {
        queryDelay: {
          ...mockResolve.attributes.queryDelay,
          delay: 19,
        },
      },
    });

    const result = await client.update({
      delay: 19,
    });

    expect(savedObjectsClient.update).toHaveBeenCalledWith(
      RULES_SETTINGS_SAVED_OBJECT_TYPE,
      RULES_SETTINGS_SAVED_OBJECT_ID,
      {
        flapping: expect.objectContaining({
          enabled: true,
          lookBackWindow: 20,
          statusChangeThreshold: 4,
        }),
        queryDelay: expect.objectContaining({
          delay: 19,
          updatedAt: '2023-03-26T00:00:00.000Z',
          updatedBy: 'updated-user',
          createdBy: 'test name',
          createdAt: '2023-03-24T00:00:00.000Z',
        }),
      },
      { version: '123' }
    );

    expect(result).toEqual(
      expect.objectContaining({
        delay: 19,
        createdBy: 'test name',
        updatedBy: 'test name',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    );
  });

  test('throws if savedObjectsClient failed to update', async () => {
    const client = new RulesSettingsQueryDelayClient(rulesSettingsQueryDelayClientParams);
    savedObjectsClient.update.mockRejectedValueOnce(new Error('failed!!'));

    await expect(
      client.update({
        delay: 19,
      })
    ).rejects.toThrowError(
      'savedObjectsClient errored trying to update query delay settings: failed!!'
    );
  });

  test('throws if new query delay setting fails verification', async () => {
    const client = new RulesSettingsQueryDelayClient(rulesSettingsQueryDelayClientParams);
    await expect(
      client.update({
        delay: 200,
      })
    ).rejects.toThrowError('Invalid query delay value, must be between 0 and 60, but got: 200.');
  });
});
