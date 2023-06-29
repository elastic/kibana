/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { RRule } from 'rrule';
import { update } from './update';
import { savedObjectsClientMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { SavedObject } from '@kbn/core/server';
import {
  MaintenanceWindowClientContext,
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
} from '../../../common';
import { getMockMaintenanceWindow } from './test_helpers';

const savedObjectsClient = savedObjectsClientMock.create();

const firstTimestamp = '2023-02-26T00:00:00.000Z';
const secondTimestamp = '2023-03-26T00:00:00.000Z';

const updatedAttributes = {
  title: 'updated-title',
  enabled: false,
  duration: 2 * 60 * 60 * 1000,
  rRule: {
    tzid: 'CET',
    dtstart: '2023-03-26T00:00:00.000Z',
    freq: RRule.WEEKLY,
    count: 2,
  },
};

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

describe('MaintenanceWindowClient - update', () => {
  beforeEach(() => {
    mockContext.getModificationMetadata.mockResolvedValue(updatedMetadata);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should call update with the correct parameters', async () => {
    jest.useFakeTimers().setSystemTime(new Date(firstTimestamp));

    const mockMaintenanceWindow = getMockMaintenanceWindow({
      expirationDate: moment(new Date()).tz('UTC').add(1, 'year').toISOString(),
    });

    savedObjectsClient.get.mockResolvedValueOnce({
      attributes: mockMaintenanceWindow,
      version: '123',
      id: 'test-id',
    } as unknown as SavedObject);

    savedObjectsClient.create.mockResolvedValueOnce({
      attributes: {
        ...mockMaintenanceWindow,
        ...updatedAttributes,
        ...updatedMetadata,
      },
      id: 'test-id',
    } as unknown as SavedObject);

    jest.useFakeTimers().setSystemTime(new Date(secondTimestamp));

    const result = await update(mockContext, {
      id: 'test-id',
      ...updatedAttributes,
    });

    expect(savedObjectsClient.get).toHaveBeenLastCalledWith(
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      'test-id'
    );
    expect(savedObjectsClient.create).toHaveBeenLastCalledWith(
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      {
        ...updatedAttributes,
        events: [
          { gte: '2023-03-26T00:00:00.000Z', lte: '2023-03-26T02:00:00.000Z' },
          { gte: '2023-04-01T23:00:00.000Z', lte: '2023-04-02T01:00:00.000Z' }, // Daylight savings
        ],
        expirationDate: moment(new Date(secondTimestamp)).tz('UTC').add(1, 'year').toISOString(),
        createdAt: '2023-02-26T00:00:00.000Z',
        createdBy: 'test-user',
        updatedAt: updatedMetadata.updatedAt,
        updatedBy: updatedMetadata.updatedBy,
      },
      { id: 'test-id' }
    );
    // Only these 3 properties are worth asserting since the rest come from mocks
    expect(result).toEqual(
      expect.objectContaining({
        id: 'test-id',
        status: 'finished',
        eventStartTime: '2023-03-05T00:00:00.000Z',
        eventEndTime: '2023-03-05T01:00:00.000Z',
      })
    );
  });

  it('should not regenerate all events if rrule and duration did not change', async () => {
    jest.useFakeTimers().setSystemTime(new Date(firstTimestamp));

    const modifiedEvents = [
      { gte: '2023-03-26T00:00:00.000Z', lte: '2023-03-26T00:12:34.000Z' },
      { gte: '2023-04-01T23:00:00.000Z', lte: '2023-04-01T23:43:21.000Z' },
    ];
    const mockMaintenanceWindow = getMockMaintenanceWindow({
      rRule: {
        tzid: 'CET',
        dtstart: '2023-03-26T00:00:00.000Z',
        freq: RRule.WEEKLY,
        count: 5,
      },
      events: modifiedEvents,
      expirationDate: moment(new Date(firstTimestamp)).tz('UTC').add(2, 'week').toISOString(),
    });

    savedObjectsClient.get.mockResolvedValue({
      attributes: mockMaintenanceWindow,
      version: '123',
      id: 'test-id',
    } as unknown as SavedObject);

    savedObjectsClient.create.mockResolvedValue({
      attributes: {
        ...mockMaintenanceWindow,
        ...updatedAttributes,
        ...updatedMetadata,
      },
      id: 'test-id',
    } as unknown as SavedObject);

    // Update without changing duration or rrule
    await update(mockContext, { id: 'test-id' });
    // Events keep the previous modified events, but adds on the new events
    expect(savedObjectsClient.create).toHaveBeenLastCalledWith(
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      expect.objectContaining({
        events: [...modifiedEvents, expect.any(Object), expect.any(Object), expect.any(Object)],
      }),
      { id: 'test-id' }
    );

    // Update with changing rrule
    await update(mockContext, {
      id: 'test-id',
      rRule: {
        tzid: 'CET',
        dtstart: '2023-03-26T00:00:00.000Z',
        freq: RRule.WEEKLY,
        count: 2,
      },
    });
    // All events are regenerated
    expect(savedObjectsClient.create).toHaveBeenLastCalledWith(
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      expect.objectContaining({
        events: [
          { gte: '2023-03-26T00:00:00.000Z', lte: '2023-03-26T01:00:00.000Z' },
          { gte: '2023-04-01T23:00:00.000Z', lte: '2023-04-02T00:00:00.000Z' },
        ],
      }),
      { id: 'test-id' }
    );
  });

  it('should throw if updating a maintenance window that has expired', async () => {
    jest.useFakeTimers().setSystemTime(new Date(firstTimestamp));
    const mockMaintenanceWindow = getMockMaintenanceWindow({
      expirationDate: moment(new Date(firstTimestamp)).tz('UTC').subtract(1, 'year').toISOString(),
    });

    savedObjectsClient.get.mockResolvedValueOnce({
      attributes: mockMaintenanceWindow,
      version: '123',
      id: 'test-id',
    } as unknown as SavedObject);

    await expect(async () => {
      await update(mockContext, { id: 'test-id', ...updatedAttributes });
    }).rejects.toThrowError();

    expect(mockContext.logger.error).toHaveBeenLastCalledWith(
      'Failed to update maintenance window by id: test-id, Error: Error: Cannot edit archived maintenance windows'
    );
  });
});
