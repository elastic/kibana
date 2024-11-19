/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { Frequency } from '@kbn/rrule';
import { archiveMaintenanceWindow } from './archive_maintenance_window';
import {
  savedObjectsClientMock,
  loggingSystemMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { SavedObjectsUpdateResponse, SavedObject } from '@kbn/core/server';
import {
  MaintenanceWindowClientContext,
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
} from '../../../../../common';
import { getMockMaintenanceWindow } from '../../../../data/maintenance_window/test_helpers';
import type { MaintenanceWindow } from '../../types';

const savedObjectsClient = savedObjectsClientMock.create();
const uiSettings = uiSettingsServiceMock.createClient();

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
  uiSettings,
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

    // Move to some time in the future
    jest.useFakeTimers().setSystemTime(new Date(secondTimestamp));
    await archiveMaintenanceWindow(mockContext, { id: 'test-id', archive: true });

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
          { gte: '2023-02-26T00:00:00.000Z', lte: '2023-02-26T01:00:00.000Z' },
          { gte: '2023-03-05T00:00:00.000Z', lte: '2023-03-05T01:00:00.000Z' },
        ],
        expirationDate: new Date().toISOString(),
        updatedAt: updatedMetadata.updatedAt,
        updatedBy: updatedMetadata.updatedBy,
      },
      { version: '123' }
    );
  });

  it('should unarchive maintenance window', async () => {
    jest.useFakeTimers().setSystemTime(new Date(firstTimestamp));
    const mockMaintenanceWindow = getMockMaintenanceWindow({
      expirationDate: moment(new Date()).tz('UTC').add(1, 'year').toISOString(),
    });

    savedObjectsClient.get.mockResolvedValueOnce({
      attributes: {
        ...mockMaintenanceWindow,
        expirationDate: new Date().toISOString(),
      },
      version: '123',
      id: 'test-id',
    } as unknown as SavedObject);

    savedObjectsClient.update.mockResolvedValueOnce({
      attributes: {
        ...mockMaintenanceWindow,
        ...updatedMetadata,
      },
    } as unknown as SavedObjectsUpdateResponse);

    // Move to some time in the future
    jest.useFakeTimers().setSystemTime(new Date(secondTimestamp));
    await archiveMaintenanceWindow(mockContext, { id: 'test-id', archive: false });

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
          { gte: '2023-02-26T00:00:00.000Z', lte: '2023-02-26T01:00:00.000Z' },
          { gte: '2023-03-05T00:00:00.000Z', lte: '2023-03-05T01:00:00.000Z' },
        ],
        expirationDate: moment.utc().add(1, 'year').toISOString(),
        updatedAt: updatedMetadata.updatedAt,
        updatedBy: updatedMetadata.updatedBy,
      },
      { version: '123' }
    );
  });

  it('should preserve finished events when archiving', async () => {
    jest.useFakeTimers().setSystemTime(new Date(firstTimestamp));
    const modifiedEvents = [
      { gte: '2023-03-26T00:00:00.000Z', lte: '2023-03-26T00:12:34.000Z' },
      { gte: '2023-04-01T23:00:00.000Z', lte: '2023-04-01T23:43:21.000Z' },
      { gte: '2023-04-08T23:00:00.000Z', lte: '2023-04-09T00:00:00.000Z' },
      { gte: '2023-04-15T23:00:00.000Z', lte: '2023-04-15T23:30:00.000Z' },
      { gte: '2023-04-22T23:00:00.000Z', lte: '2023-04-23T00:00:00.000Z' },
    ];
    const mockMaintenanceWindow = getMockMaintenanceWindow({
      rRule: {
        tzid: 'CET',
        dtstart: '2023-03-26T00:00:00.000Z',
        freq: Frequency.WEEKLY,
        count: 5,
      } as MaintenanceWindow['rRule'],
      events: modifiedEvents,
      expirationDate: moment(new Date(firstTimestamp)).tz('UTC').add(2, 'week').toISOString(),
    });

    savedObjectsClient.get.mockResolvedValue({
      attributes: mockMaintenanceWindow,
      version: '123',
      id: 'test-id',
    } as unknown as SavedObject);

    savedObjectsClient.update.mockResolvedValue({
      attributes: {
        ...mockMaintenanceWindow,
        ...updatedMetadata,
      },
      id: 'test-id',
    } as unknown as SavedObjectsUpdateResponse);

    jest.useFakeTimers().setSystemTime(new Date('2023-04-16T00:00:00.000Z'));
    await archiveMaintenanceWindow(mockContext, { id: 'test-id', archive: true });

    expect(savedObjectsClient.update).toHaveBeenLastCalledWith(
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      'test-id',
      {
        ...mockMaintenanceWindow,
        events: modifiedEvents.slice(0, 4),
        expirationDate: new Date().toISOString(),
        updatedAt: updatedMetadata.updatedAt,
        updatedBy: updatedMetadata.updatedBy,
      },
      { version: '123' }
    );
  });
});
