/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { archive } from './archive';
import { savedObjectsClientMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { SavedObjectsUpdateResponse, SavedObject } from '@kbn/core/server';
import {
  MaintenanceWindowClientContext,
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
} from '../../../common';
import { getMockMaintenanceWindow } from './test_helpers';

const savedObjectsClient = savedObjectsClientMock.create();

const firstTimestamp = '2023-02-26T00:00:00.000Z';
const secondTimestamp = '2023-03-26T00:00:00.000Z';

const updatedMetadata = {
  createdAt: '2023-03-26T00:00:00.000Z',
  updatedAt: '2023-03-26T00:00:00.000Z',
  createdBy: 'updated-user',
  updatedBy: 'updated-user',
};

const mockContext: jest.Mocked<MaintenanceWindowClientContext> = {
  logger: loggingSystemMock.create().get(),
  getModificationMetadata: jest.fn(),
  savedObjectsClient,
};

describe('MaintenanceWindowClient - archive', () => {
  beforeEach(() => {
    mockContext.getModificationMetadata.mockResolvedValueOnce(updatedMetadata);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should archive maintenance windows', async () => {
    jest.useFakeTimers().setSystemTime(new Date(firstTimestamp));

    const mockMaintenanceWindow = getMockMaintenanceWindow({
      expirationDate: moment(new Date()).tz('UTC').add(1, 'year').toISOString(),
    });

    savedObjectsClient.get.mockResolvedValueOnce({
      attributes: mockMaintenanceWindow,
      version: '123',
      id: 'test-id',
    } as unknown as SavedObject);

    savedObjectsClient.update.mockResolvedValueOnce({
      attributes: {
        ...mockMaintenanceWindow,
        ...updatedMetadata,
      },
    } as unknown as SavedObjectsUpdateResponse);

    jest.useFakeTimers().setSystemTime(new Date(secondTimestamp));

    await archive(mockContext, {
      id: 'test-id',
    });

    expect(savedObjectsClient.get).toHaveBeenLastCalledWith(
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      'test-id'
    );

    expect(savedObjectsClient.update).toHaveBeenLastCalledWith(
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      'test-id',
      {
        ...mockMaintenanceWindow,
        events: [
          {
            gte: '2023-02-26T00:00:00.000Z',
            lte: '2023-02-26T01:00:00.000Z',
          },
          {
            gte: '2023-03-05T00:00:00.000Z',
            lte: '2023-03-05T01:00:00.000Z',
          },
        ],
        expirationDate: new Date().toISOString(),
        ...updatedMetadata,
      },
      { version: '123' }
    );
  });
});
