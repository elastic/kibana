/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bulkGetMaintenanceWindows } from './bulk_get_maintenance_windows';
import {
  savedObjectsClientMock,
  loggingSystemMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { SavedObject } from '@kbn/core/server';
import {
  MaintenanceWindowClientContext,
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
} from '../../../../../common';
import { getMockMaintenanceWindow } from '../../../../data/maintenance_window/test_helpers';

const savedObjectsClient = savedObjectsClientMock.create();
const uiSettings = uiSettingsServiceMock.createClient();

const mockContext: jest.Mocked<MaintenanceWindowClientContext> = {
  logger: loggingSystemMock.create().get(),
  getModificationMetadata: jest.fn(),
  savedObjectsClient,
  uiSettings,
};

describe('MaintenanceWindowClient - get', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should bulk get maintenance window by ids', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-02-26T00:00:00.000Z'));
    const mockMaintenanceWindow1 = getMockMaintenanceWindow({
      title: 'mw1',
      expirationDate: new Date().toISOString(),
    });
    const mockMaintenanceWindow2 = getMockMaintenanceWindow({
      title: 'mw2',
      expirationDate: new Date().toISOString(),
    });

    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          attributes: mockMaintenanceWindow1,
          id: 'id-1',
        } as unknown as SavedObject,
        {
          attributes: mockMaintenanceWindow2,
          id: 'id-2',
        } as unknown as SavedObject,
      ],
    });

    const result = await bulkGetMaintenanceWindows(mockContext, { ids: ['id-1', 'id-2'] });

    expect(savedObjectsClient.bulkGet).toHaveBeenLastCalledWith([
      {
        id: 'id-1',
        type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      },
      {
        id: 'id-2',
        type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      },
    ]);
    expect(result.maintenanceWindows).toEqual([
      expect.objectContaining(mockMaintenanceWindow1),
      expect.objectContaining(mockMaintenanceWindow2),
    ]);
  });
});
