/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findMaintenanceWindows } from './find_maintenance_windows';
import {
  savedObjectsClientMock,
  loggingSystemMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { SavedObjectsFindResponse } from '@kbn/core/server';
import {
  MaintenanceWindowClientContext,
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
} from '../../../../../common';
import { getMockMaintenanceWindow } from '../../../../data/maintenance_window/test_helpers';
import { findMaintenanceWindowsParamsSchema } from './schemas';

const savedObjectsClient = savedObjectsClientMock.create();
const uiSettings = uiSettingsServiceMock.createClient();

const mockContext: jest.Mocked<MaintenanceWindowClientContext> = {
  logger: loggingSystemMock.create().get(),
  getModificationMetadata: jest.fn(),
  savedObjectsClient,
  uiSettings,
};

describe('MaintenanceWindowClient - find', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('throws an error if page is string', async () => {
    savedObjectsClient.find.mockResolvedValueOnce({
      saved_objects: [
        {
          attributes: getMockMaintenanceWindow({ expirationDate: new Date().toISOString() }),
          id: 'test-1',
        },
        {
          attributes: getMockMaintenanceWindow({ expirationDate: new Date().toISOString() }),
          id: 'test-2',
        },
      ],
      page: 1,
      per_page: 5,
    } as unknown as SavedObjectsFindResponse);

    await expect(
      // @ts-expect-error: testing validation of strings
      findMaintenanceWindows(mockContext, { page: 'dfsd', perPage: 10 })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      '"Error validating find maintenance windows data - [page]: expected value of type [number] but got [string]"'
    );
  });

  it('throws an error if savedObjectsClient.find will throw an error', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-02-26T00:00:00.000Z'));

    savedObjectsClient.find.mockImplementation(() => {
      throw new Error('something went wrong!');
    });

    await expect(
      findMaintenanceWindows(mockContext, { page: 1, perPage: 10 })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      '"Failed to find maintenance window, Error: Error: something went wrong!: something went wrong!"'
    );
  });

  it('should find maintenance windows', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-02-26T00:00:00.000Z'));
    const spy = jest.spyOn(findMaintenanceWindowsParamsSchema, 'validate');

    savedObjectsClient.find.mockResolvedValueOnce({
      saved_objects: [
        {
          attributes: getMockMaintenanceWindow({ expirationDate: new Date().toISOString() }),
          id: 'test-1',
        },
        {
          attributes: getMockMaintenanceWindow({ expirationDate: new Date().toISOString() }),
          id: 'test-2',
        },
      ],
      page: 1,
      per_page: 5,
    } as unknown as SavedObjectsFindResponse);

    const result = await findMaintenanceWindows(mockContext, {});

    expect(spy).toHaveBeenCalledWith({});
    expect(savedObjectsClient.find).toHaveBeenLastCalledWith({
      type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
    });

    expect(result.data.length).toEqual(2);
    expect(result.data[0].id).toEqual('test-1');
    expect(result.data[1].id).toEqual('test-2');
    expect(result.page).toEqual(1);
    expect(result.perPage).toEqual(5);
  });
});
