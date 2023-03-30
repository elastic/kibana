/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { RRule } from 'rrule';
import { finish } from './finish';
import { savedObjectsClientMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { SavedObjectsUpdateResponse, SavedObject } from '@kbn/core/server';
import {
  MaintenanceWindowClientContext,
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
} from '../../../common';
import { getMockMaintenanceWindow } from './test_helpers';

const savedObjectsClient = savedObjectsClientMock.create();

const firstTimestamp = '2023-02-26T00:00:00.000Z';

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

describe('MaintenanceWindowClient - finish', () => {
  beforeEach(() => {
    mockContext.getModificationMetadata.mockResolvedValueOnce(updatedMetadata);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should finish the currently running maintenance window event', async () => {
    jest.useFakeTimers().setSystemTime(new Date(firstTimestamp));
    const mockMaintenanceWindow = getMockMaintenanceWindow({
      duration: 60 * 60 * 1000, //
      expirationDate: moment.utc().add(1, 'year').toISOString(),
      rRule: {
        tzid: 'UTC',
        dtstart: moment().utc().toISOString(),
        freq: RRule.WEEKLY,
        count: 2,
      },
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
        events: [
          {
            gte: '2023-02-26T00:00:00.000Z',
            lte: '2023-02-26T00:30:00.000Z',
          },
          {
            gte: '2023-03-05T00:00:00.000Z',
            lte: '2023-03-05T01:00:00.000Z',
          },
        ],
      },
      id: 'test-id',
    } as unknown as SavedObjectsUpdateResponse);

    // Move 30 mins into the future
    jest.useFakeTimers().setSystemTime(moment.utc(firstTimestamp).add(30, 'minute').toDate());

    const result = await finish(mockContext, { id: 'test-id' });
    expect(savedObjectsClient.update).toHaveBeenLastCalledWith(
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      'test-id',
      expect.objectContaining({
        expirationDate: moment.utc().add(1, 'year').toISOString(),
        events: [
          {
            gte: '2023-02-26T00:00:00.000Z',
            lte: '2023-02-26T00:30:00.000Z', // Second event ends 30 mins earlier, just like expected
          },
          {
            gte: '2023-03-05T00:00:00.000Z',
            lte: '2023-03-05T01:00:00.000Z',
          },
        ],
      }),
      {
        version: '123',
      }
    );

    expect(result.status).toEqual('upcoming');
    expect(result.startDate).toEqual('2023-03-05T00:00:00.000Z');
    expect(result.endDate).toEqual('2023-03-05T01:00:00.000Z');
  });

  it('should throw if trying to finish a maintenance window that is not running', async () => {
    jest.useFakeTimers().setSystemTime(new Date(firstTimestamp));
    const mockMaintenanceWindow = getMockMaintenanceWindow({
      duration: 60 * 60 * 1000, //
      expirationDate: moment.utc().add(1, 'year').toISOString(),
      rRule: {
        tzid: 'UTC',
        dtstart: moment().utc().toISOString(),
        freq: RRule.WEEKLY,
        count: 2,
      },
    });

    savedObjectsClient.get.mockResolvedValueOnce({
      attributes: mockMaintenanceWindow,
      version: '123',
      id: 'test-id',
    } as unknown as SavedObject);

    // Move 2 hours into the future
    jest.useFakeTimers().setSystemTime(moment.utc(firstTimestamp).add(2, 'hours').toDate());

    await expect(async () => {
      await finish(mockContext, { id: 'test-id' });
    }).rejects.toThrowError();

    expect(mockContext.logger.error).toHaveBeenLastCalledWith(
      'Failed to finish maintenance window by id: test-id, Error: Error: Cannot finish maintenance window that is not running'
    );
  });
});
