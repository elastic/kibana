/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { Frequency } from '@kbn/rrule';
import { updateMaintenanceWindow } from './update_maintenance_window';
import { UpdateMaintenanceWindowParams } from './types';
import { savedObjectsClientMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { SavedObject } from '@kbn/core/server';
import {
  MaintenanceWindowClientContext,
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
} from '../../../../../common';
import { getMockMaintenanceWindow } from '../../../../data/maintenance_window/test_helpers';
import type { MaintenanceWindow } from '../../types';
import { FilterStateStore } from '@kbn/es-query';

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
    freq: Frequency.WEEKLY,
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

    const result = await updateMaintenanceWindow(mockContext, {
      id: 'test-id',
      data: {
        ...updatedAttributes,
        rRule: updatedAttributes.rRule as UpdateMaintenanceWindowParams['data']['rRule'],
        categoryIds: ['observability', 'securitySolution'],
      },
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
        categoryIds: ['observability', 'securitySolution'],
      },
      {
        id: 'test-id',
        overwrite: true,
        version: '123',
      }
    );
    // Only these properties are worth asserting since the rest come from mocks
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

    savedObjectsClient.create.mockResolvedValue({
      attributes: {
        ...mockMaintenanceWindow,
        ...updatedAttributes,
        ...updatedMetadata,
      },
      id: 'test-id',
    } as unknown as SavedObject);

    // Update without changing duration or rrule
    await updateMaintenanceWindow(mockContext, { id: 'test-id', data: {} });
    // Events keep the previous modified events, but adds on the new events
    expect(savedObjectsClient.create).toHaveBeenLastCalledWith(
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      expect.objectContaining({
        events: [...modifiedEvents, expect.any(Object), expect.any(Object), expect.any(Object)],
      }),
      {
        id: 'test-id',
        overwrite: true,
        version: '123',
      }
    );

    // Update with changing rrule
    await updateMaintenanceWindow(mockContext, {
      id: 'test-id',
      data: {
        rRule: {
          tzid: 'CET',
          dtstart: '2023-03-26T00:00:00.000Z',
          freq: Frequency.WEEKLY,
          count: 2,
        },
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
      {
        id: 'test-id',
        overwrite: true,
        version: '123',
      }
    );
  });

  it('should update maintenance window with scoped query', async () => {
    jest.useFakeTimers().setSystemTime(new Date(firstTimestamp));

    const modifiedEvents = [
      { gte: '2023-03-26T00:00:00.000Z', lte: '2023-03-26T00:12:34.000Z' },
      { gte: '2023-04-01T23:00:00.000Z', lte: '2023-04-01T23:43:21.000Z' },
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
      categoryIds: ['observability'],
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

    await updateMaintenanceWindow(mockContext, {
      id: 'test-id',
      data: {
        scopedQuery: {
          kql: "_id: '1234'",
          filters: [
            {
              meta: {
                disabled: false,
                negate: false,
                alias: null,
                key: 'kibana.alert.action_group',
                field: 'kibana.alert.action_group',
                params: {
                  query: 'test',
                },
                type: 'phrase',
              },
              $state: {
                store: FilterStateStore.APP_STATE,
              },
              query: {
                match_phrase: {
                  'kibana.alert.action_group': 'test',
                },
              },
            },
          ],
        },
      },
    });

    expect(
      (savedObjectsClient.create.mock.calls[0][1] as MaintenanceWindow).scopedQuery!.kql
    ).toEqual(`_id: '1234'`);

    expect(
      (savedObjectsClient.create.mock.calls[0][1] as MaintenanceWindow).scopedQuery!.filters[0]
    ).toEqual({
      $state: { store: 'appState' },
      meta: {
        alias: null,
        disabled: false,
        field: 'kibana.alert.action_group',
        key: 'kibana.alert.action_group',
        negate: false,
        params: { query: 'test' },
        type: 'phrase',
      },
      query: { match_phrase: { 'kibana.alert.action_group': 'test' } },
    });

    expect(
      (savedObjectsClient.create.mock.calls[0][1] as MaintenanceWindow).scopedQuery!.dsl
    ).toMatchInlineSnapshot(
      `"{\\"bool\\":{\\"must\\":[],\\"filter\\":[{\\"bool\\":{\\"should\\":[{\\"match\\":{\\"_id\\":\\"'1234'\\"}}],\\"minimum_should_match\\":1}},{\\"match_phrase\\":{\\"kibana.alert.action_group\\":\\"test\\"}}],\\"should\\":[],\\"must_not\\":[]}}"`
    );
  });

  it('should remove maintenance window with scoped query', async () => {
    jest.useFakeTimers().setSystemTime(new Date(firstTimestamp));

    const modifiedEvents = [
      { gte: '2023-03-26T00:00:00.000Z', lte: '2023-03-26T00:12:34.000Z' },
      { gte: '2023-04-01T23:00:00.000Z', lte: '2023-04-01T23:43:21.000Z' },
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

    savedObjectsClient.create.mockResolvedValue({
      attributes: {
        ...mockMaintenanceWindow,
        ...updatedAttributes,
        ...updatedMetadata,
      },
      id: 'test-id',
    } as unknown as SavedObject);

    await updateMaintenanceWindow(mockContext, {
      id: 'test-id',
      data: {
        scopedQuery: null,
      },
    });

    expect(
      (savedObjectsClient.create.mock.calls[0][1] as MaintenanceWindow).scopedQuery
    ).toBeNull();
  });

  it('should throw if updating a maintenance window with invalid scoped query', async () => {
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
      await updateMaintenanceWindow(mockContext, {
        id: 'test-id',
        data: {
          scopedQuery: {
            kql: 'invalid: ',
            filters: [],
          },
        },
      });
    }).rejects.toThrowErrorMatchingInlineSnapshot(`
      "Error validating update maintenance window data - invalid scoped query - Expected \\"(\\", \\"{\\", value, whitespace but end of input found.
      invalid: 
      ---------^"
    `);
  });

  it('should throw if trying to update a MW with a scoped query with other than 1 category ID', async () => {
    jest.useFakeTimers().setSystemTime(new Date(firstTimestamp));
    const mockMaintenanceWindow = getMockMaintenanceWindow({
      expirationDate: moment(new Date(firstTimestamp)).tz('UTC').subtract(1, 'year').toISOString(),
    });

    savedObjectsClient.get.mockResolvedValueOnce({
      attributes: mockMaintenanceWindow,
      version: '123',
      id: 'test-id',
      categoryIds: ['observability', 'securitySolution'],
    } as unknown as SavedObject);

    await expect(async () => {
      await updateMaintenanceWindow(mockContext, {
        id: 'test-id',
        data: {
          scopedQuery: {
            kql: "_id: '1234'",
            filters: [
              {
                meta: {
                  disabled: false,
                  negate: false,
                  alias: null,
                  key: 'kibana.alert.action_group',
                  field: 'kibana.alert.action_group',
                  params: {
                    query: 'test',
                  },
                  type: 'phrase',
                },
                $state: {
                  store: FilterStateStore.APP_STATE,
                },
                query: {
                  match_phrase: {
                    'kibana.alert.action_group': 'test',
                  },
                },
              },
            ],
          },
        },
      });
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to update maintenance window by id: test-id, Error: Error: Cannot edit archived maintenance windows: Cannot edit archived maintenance windows"`
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
      await updateMaintenanceWindow(mockContext, {
        id: 'test-id',
        data: {
          rRule: {
            tzid: 'CET',
            dtstart: '2023-03-26T00:00:00.000Z',
            freq: Frequency.WEEKLY,
            count: 2,
          },
        },
      });
    }).rejects.toThrowError();

    expect(mockContext.logger.error).toHaveBeenLastCalledWith(
      'Failed to update maintenance window by id: test-id, Error: Error: Cannot edit archived maintenance windows'
    );
  });

  it('should throw if updating a maintenance window with invalid category ids', async () => {
    await expect(async () => {
      await updateMaintenanceWindow(mockContext, {
        id: 'test-id',
        data: {
          categoryIds: ['invalid_id'] as unknown as MaintenanceWindow['categoryIds'],
          rRule: {
            tzid: 'CET',
            dtstart: '2023-03-26T00:00:00.000Z',
            freq: Frequency.WEEKLY,
            count: 2,
          },
        },
      });
    }).rejects.toThrowErrorMatchingInlineSnapshot(`
      "Error validating update maintenance window data - [data.categoryIds]: types that failed validation:
      - [data.categoryIds.0.0]: types that failed validation:
       - [data.categoryIds.0.0]: expected value to equal [observability]
       - [data.categoryIds.0.1]: expected value to equal [securitySolution]
       - [data.categoryIds.0.2]: expected value to equal [management]
      - [data.categoryIds.1]: expected value to equal [null]"
    `);
  });
});
