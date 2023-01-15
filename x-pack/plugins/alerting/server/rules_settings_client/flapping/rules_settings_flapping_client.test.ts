/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RulesSettingsFlappingClient,
  RulesSettingsFlappingClientConstructorOptions,
} from './rules_settings_flapping_client';
import { savedObjectsClientMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  RULES_SETTINGS_FEATURE_ID,
  RULES_SETTINGS_SAVED_OBJECT_TYPE,
  RULES_SETTINGS_SAVED_OBJECT_ID,
  DEFAULT_FLAPPING_SETTINGS,
  RulesSettings,
} from '../../../common';

const mockDateString = '2019-02-12T21:01:22.479Z';

const savedObjectsClient = savedObjectsClientMock.create();

const getMockRulesSettings = (): RulesSettings => {
  return {
    flapping: {
      enabled: DEFAULT_FLAPPING_SETTINGS.enabled,
      lookBackWindow: DEFAULT_FLAPPING_SETTINGS.lookBackWindow,
      statusChangeThreshold: DEFAULT_FLAPPING_SETTINGS.statusChangeThreshold,
      createdBy: 'test name',
      updatedBy: 'test name',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
};

const rulesSettingsFlappingClientParams: jest.Mocked<RulesSettingsFlappingClientConstructorOptions> =
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

describe('RulesSettingsFlappingClient', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(mockDateString));
  });

  afterAll(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('can get flapping settings', async () => {
    const client = new RulesSettingsFlappingClient(rulesSettingsFlappingClientParams);
    const result = await client.get();

    expect(result).toEqual(
      expect.objectContaining({
        enabled: DEFAULT_FLAPPING_SETTINGS.enabled,
        lookBackWindow: DEFAULT_FLAPPING_SETTINGS.lookBackWindow,
        statusChangeThreshold: DEFAULT_FLAPPING_SETTINGS.statusChangeThreshold,
        createdBy: 'test name',
        updatedBy: 'test name',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    );
  });

  test('can update flapping settings', async () => {
    const client = new RulesSettingsFlappingClient(rulesSettingsFlappingClientParams);

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
        flapping: {
          ...mockResolve.attributes.flapping,
          enabled: false,
          lookBackWindow: 19,
          statusChangeThreshold: 3,
        },
      },
    });

    const result = await client.update({
      enabled: false,
      lookBackWindow: 19,
      statusChangeThreshold: 3,
    });

    expect(savedObjectsClient.update).toHaveBeenCalledWith(
      RULES_SETTINGS_SAVED_OBJECT_TYPE,
      RULES_SETTINGS_SAVED_OBJECT_ID,
      {
        flapping: expect.objectContaining({
          enabled: false,
          lookBackWindow: 19,
          statusChangeThreshold: 3,
          createdBy: 'test name',
          updatedBy: 'test name',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      },
      { version: '123', retryOnConflict: 3 }
    );

    expect(result).toEqual(
      expect.objectContaining({
        enabled: false,
        lookBackWindow: 19,
        statusChangeThreshold: 3,
        createdBy: 'test name',
        updatedBy: 'test name',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    );
  });

  test('throws if savedObjectsClient failed to update', async () => {
    const client = new RulesSettingsFlappingClient(rulesSettingsFlappingClientParams);
    savedObjectsClient.update.mockRejectedValueOnce(new Error('failed!!'));

    await expect(
      client.update({
        enabled: false,
        lookBackWindow: 19,
        statusChangeThreshold: 3,
      })
    ).rejects.toThrowError(
      'savedObjectsClient errored trying to update flapping settings: failed!!'
    );
  });

  test('throws if new flapping setting fails verification', async () => {
    const client = new RulesSettingsFlappingClient(rulesSettingsFlappingClientParams);
    await expect(
      client.update({
        enabled: true,
        lookBackWindow: 200,
        statusChangeThreshold: 500,
      })
    ).rejects.toThrowError('Invalid lookBackWindow value, must be between 2 and 20, but got: 200.');

    await expect(
      client.update({
        enabled: true,
        lookBackWindow: 20,
        statusChangeThreshold: 500,
      })
    ).rejects.toThrowError(
      'Invalid statusChangeThreshold value, must be between 2 and 20, but got: 500.'
    );

    await expect(
      client.update({
        enabled: true,
        lookBackWindow: 10,
        statusChangeThreshold: 20,
      })
    ).rejects.toThrowError(
      'Invalid values,lookBackWindow (10) must be equal to or greater than statusChangeThreshold (20).'
    );
  });
});
