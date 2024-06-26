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

  it('should find maintenance windows', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-02-26T00:00:00.000Z'));

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
    } as unknown as SavedObjectsFindResponse);

    const result = await findMaintenanceWindows(mockContext);

    expect(savedObjectsClient.find).toHaveBeenLastCalledWith({
      type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
    });

    expect(result.data.length).toEqual(2);
    expect(result.data[0].id).toEqual('test-1');
    expect(result.data[1].id).toEqual('test-2');
  });
});
