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
  RULES_SETTINGS_FLAPPING_SAVED_OBJECT_ID,
  DEFAULT_FLAPPING_SETTINGS,
  RulesSettings,
} from '../../../common';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';

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
  };
};

const rulesSettingsFlappingClientParams: jest.Mocked<RulesSettingsFlappingClientConstructorOptions> =
  {
    logger: loggingSystemMock.create().get(),
    getModificationMetadata: jest.fn(),
    savedObjectsClient,
  };

const updatedMetadata = {
  createdAt: '2023-03-26T00:00:00.000Z',
  updatedAt: '2023-03-26T00:00:00.000Z',
  createdBy: 'updated-user',
  updatedBy: 'updated-user',
};

describe('RulesSettingsFlappingClient', () => {
  beforeEach(() => {
    rulesSettingsFlappingClientParams.getModificationMetadata.mockResolvedValue(updatedMetadata);
    savedObjectsClient.get.mockResolvedValue({
      id: RULES_SETTINGS_FEATURE_ID,
      type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
      attributes: getMockRulesSettings(),
      references: [],
      version: '123',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

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
      RULES_SETTINGS_FLAPPING_SAVED_OBJECT_ID,
      {
        flapping: expect.objectContaining({
          enabled: false,
          lookBackWindow: 19,
          statusChangeThreshold: 3,
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

  test('can create a new flapping settings saved object', async () => {
    rulesSettingsFlappingClientParams.getModificationMetadata.mockResolvedValueOnce({
      ...updatedMetadata,
      createdBy: 'test name',
      updatedBy: 'test name',
    });
    const client = new RulesSettingsFlappingClient(rulesSettingsFlappingClientParams);
    const mockAttributes = getMockRulesSettings();

    savedObjectsClient.create.mockResolvedValueOnce({
      id: RULES_SETTINGS_FEATURE_ID,
      type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
      attributes: mockAttributes,
      references: [],
    });

    // @ts-expect-error access private method
    const result = await client.createSettings();

    expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      RULES_SETTINGS_SAVED_OBJECT_TYPE,
      {
        flapping: expect.objectContaining({
          enabled: mockAttributes.flapping?.enabled,
          lookBackWindow: mockAttributes.flapping?.lookBackWindow,
          statusChangeThreshold: mockAttributes.flapping?.statusChangeThreshold,
          createdBy: 'test name',
          updatedBy: 'test name',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      },
      {
        id: RULES_SETTINGS_FLAPPING_SAVED_OBJECT_ID,
        overwrite: true,
      }
    );
    expect(result.attributes).toEqual(mockAttributes);
  });

  test('can get existing flapping settings saved object', async () => {
    const client = new RulesSettingsFlappingClient(rulesSettingsFlappingClientParams);
    const mockAttributes = getMockRulesSettings();

    savedObjectsClient.get.mockResolvedValueOnce({
      id: RULES_SETTINGS_FEATURE_ID,
      type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
      attributes: mockAttributes,
      references: [],
    });
    // @ts-expect-error access private method
    const result = await client.getSettings();
    expect(result.attributes).toEqual(mockAttributes);
  });

  test('throws if there is no existing saved object to get', async () => {
    const client = new RulesSettingsFlappingClient(rulesSettingsFlappingClientParams);

    savedObjectsClient.get.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createGenericNotFoundError(
        RULES_SETTINGS_SAVED_OBJECT_TYPE,
        RULES_SETTINGS_FLAPPING_SAVED_OBJECT_ID
      )
    );
    // @ts-expect-error access private method
    await expect(client.getSettings()).rejects.toThrowError();
  });

  test('can persist flapping settings when saved object does not exist', async () => {
    rulesSettingsFlappingClientParams.getModificationMetadata.mockResolvedValueOnce({
      ...updatedMetadata,
      createdBy: 'test name',
      updatedBy: 'test name',
    });
    const client = new RulesSettingsFlappingClient(rulesSettingsFlappingClientParams);
    const mockAttributes = getMockRulesSettings();
    savedObjectsClient.get.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createGenericNotFoundError(
        RULES_SETTINGS_SAVED_OBJECT_TYPE,
        RULES_SETTINGS_FLAPPING_SAVED_OBJECT_ID
      )
    );

    savedObjectsClient.create.mockResolvedValueOnce({
      id: RULES_SETTINGS_FEATURE_ID,
      type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
      attributes: mockAttributes,
      references: [],
    });

    const result = await client.get();

    expect(savedObjectsClient.get).toHaveBeenCalledWith(
      RULES_SETTINGS_SAVED_OBJECT_TYPE,
      RULES_SETTINGS_FLAPPING_SAVED_OBJECT_ID
    );

    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      RULES_SETTINGS_SAVED_OBJECT_TYPE,
      {
        flapping: expect.objectContaining({
          enabled: mockAttributes.flapping?.enabled,
          lookBackWindow: mockAttributes.flapping?.lookBackWindow,
          statusChangeThreshold: mockAttributes.flapping?.statusChangeThreshold,
          createdBy: 'test name',
          updatedBy: 'test name',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      },
      {
        id: RULES_SETTINGS_FLAPPING_SAVED_OBJECT_ID,
        overwrite: true,
      }
    );
    expect(result).toEqual(mockAttributes.flapping);
  });

  test('can persist flapping settings when saved object already exists', async () => {
    rulesSettingsFlappingClientParams.getModificationMetadata.mockResolvedValueOnce({
      ...updatedMetadata,
      createdBy: 'test name',
      updatedBy: 'test name',
    });
    const client = new RulesSettingsFlappingClient(rulesSettingsFlappingClientParams);
    const mockAttributes = getMockRulesSettings();

    savedObjectsClient.get.mockResolvedValueOnce({
      id: RULES_SETTINGS_FEATURE_ID,
      type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
      attributes: mockAttributes,
      references: [],
    });

    const result = await client.get();

    expect(savedObjectsClient.get).toHaveBeenCalledWith(
      RULES_SETTINGS_SAVED_OBJECT_TYPE,
      RULES_SETTINGS_FLAPPING_SAVED_OBJECT_ID
    );
    expect(savedObjectsClient.create).not.toHaveBeenCalled();
    expect(result).toEqual(mockAttributes.flapping);
  });

  test('can update flapping settings when saved object does not exist', async () => {
    rulesSettingsFlappingClientParams.getModificationMetadata.mockResolvedValueOnce({
      ...updatedMetadata,
      createdBy: 'test name',
      updatedBy: 'test name',
    });
    const client = new RulesSettingsFlappingClient(rulesSettingsFlappingClientParams);
    const mockAttributes = getMockRulesSettings();

    savedObjectsClient.get.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createGenericNotFoundError(
        RULES_SETTINGS_SAVED_OBJECT_TYPE,
        RULES_SETTINGS_FLAPPING_SAVED_OBJECT_ID
      )
    );

    const mockResolve = {
      id: RULES_SETTINGS_FEATURE_ID,
      type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
      attributes: mockAttributes,
      references: [],
      version: '123',
    };

    savedObjectsClient.create.mockResolvedValueOnce(mockResolve);
    savedObjectsClient.update.mockResolvedValueOnce({
      ...mockResolve,
      attributes: {
        flapping: {
          ...mockResolve.attributes.flapping,
          enabled: false,
          lookBackWindow: 5,
          statusChangeThreshold: 5,
        },
      },
    });

    // Try to update with new values
    const result = await client.update({
      enabled: false,
      lookBackWindow: 5,
      statusChangeThreshold: 5,
    });

    // Tried to get first, but no results
    expect(savedObjectsClient.get).toHaveBeenCalledWith(
      RULES_SETTINGS_SAVED_OBJECT_TYPE,
      RULES_SETTINGS_FLAPPING_SAVED_OBJECT_ID
    );

    // So create a new entry
    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      RULES_SETTINGS_SAVED_OBJECT_TYPE,
      {
        flapping: expect.objectContaining({
          enabled: mockAttributes.flapping?.enabled,
          lookBackWindow: mockAttributes.flapping?.lookBackWindow,
          statusChangeThreshold: mockAttributes.flapping?.statusChangeThreshold,
          createdBy: 'test name',
          updatedBy: 'test name',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      },
      {
        id: RULES_SETTINGS_FLAPPING_SAVED_OBJECT_ID,
        overwrite: true,
      }
    );

    // Try to update with version
    expect(savedObjectsClient.update).toHaveBeenCalledWith(
      RULES_SETTINGS_SAVED_OBJECT_TYPE,
      RULES_SETTINGS_FLAPPING_SAVED_OBJECT_ID,
      {
        flapping: expect.objectContaining({
          enabled: false,
          lookBackWindow: 5,
          statusChangeThreshold: 5,
          createdBy: 'test name',
          updatedBy: 'test name',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      },
      { version: '123' }
    );

    expect(result).toEqual(
      expect.objectContaining({
        enabled: false,
        lookBackWindow: 5,
        statusChangeThreshold: 5,
      })
    );
  });
});
