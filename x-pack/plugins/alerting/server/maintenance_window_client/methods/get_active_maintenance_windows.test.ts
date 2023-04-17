/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getActiveMaintenanceWindows } from './get_active_maintenance_windows';
import { toElasticsearchQuery } from '@kbn/es-query';
import { savedObjectsClientMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { SavedObjectsFindResponse } from '@kbn/core/server';
import {
  MaintenanceWindowClientContext,
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
} from '../../../common';
import { getMockMaintenanceWindow } from './test_helpers';

const savedObjectsClient = savedObjectsClientMock.create();

const mockContext: jest.Mocked<MaintenanceWindowClientContext> = {
  logger: loggingSystemMock.create().get(),
  getModificationMetadata: jest.fn(),
  savedObjectsClient,
};

describe('MaintenanceWindowClient - getActiveMaintenanceWindows', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should return active maintenance windows', async () => {
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

    const startDate = new Date().toISOString();

    const result = await getActiveMaintenanceWindows(mockContext, {
      start: startDate,
      interval: '1h',
    });

    const findCallParams = savedObjectsClient.find.mock.calls[0][0];

    expect(findCallParams.type).toEqual(MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE);

    expect(toElasticsearchQuery(findCallParams.filter)).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "filter": Array [
            Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "range": Object {
                            "maintenance-window.attributes.events": Object {
                              "gte": "2023-02-26T00:00:00.000Z",
                            },
                          },
                        },
                      ],
                    },
                  },
                  Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "range": Object {
                            "maintenance-window.attributes.events": Object {
                              "lte": "2023-02-26T01:00:00.000Z",
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
            Object {
              "bool": Object {
                "minimum_should_match": 1,
                "should": Array [
                  Object {
                    "match": Object {
                      "maintenance-window.attributes.enabled": "true",
                    },
                  },
                ],
              },
            },
          ],
        },
      }
    `);

    expect(result).toEqual([
      expect.objectContaining({
        id: 'test-1',
      }),
      expect.objectContaining({
        id: 'test-2',
      }),
    ]);
  });

  it('should return empty array if there are no active maintenance windows', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-02-26T00:00:00.000Z'));

    savedObjectsClient.find.mockResolvedValueOnce({
      saved_objects: [],
    } as unknown as SavedObjectsFindResponse);

    const startDate = new Date().toISOString();

    const result = await getActiveMaintenanceWindows(mockContext, {
      start: startDate,
      interval: '4d',
    });

    const findCallParams = savedObjectsClient.find.mock.calls[0][0];

    expect(findCallParams.type).toEqual(MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE);
    expect(toElasticsearchQuery(findCallParams.filter)).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "filter": Array [
            Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "range": Object {
                            "maintenance-window.attributes.events": Object {
                              "gte": "2023-02-26T00:00:00.000Z",
                            },
                          },
                        },
                      ],
                    },
                  },
                  Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "range": Object {
                            "maintenance-window.attributes.events": Object {
                              "lte": "2023-03-02T00:00:00.000Z",
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
            Object {
              "bool": Object {
                "minimum_should_match": 1,
                "should": Array [
                  Object {
                    "match": Object {
                      "maintenance-window.attributes.enabled": "true",
                    },
                  },
                ],
              },
            },
          ],
        },
      }
    `);
    expect(result).toEqual([]);
  });

  it('should log and throw if an error is thrown', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-02-26T00:00:00.000Z'));

    savedObjectsClient.find.mockRejectedValueOnce('something went wrong');

    const startDate = new Date().toISOString();

    await expect(async () => {
      await getActiveMaintenanceWindows(mockContext, {
        start: startDate,
        interval: '4d',
      });
    }).rejects.toThrowError();

    expect(mockContext.logger.error).toHaveBeenLastCalledWith(
      'Failed to find active maintenance window by interval: 4d with start date: 2023-02-26T00:00:00.000Z, Error: something went wrong'
    );
  });
});
