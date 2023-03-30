/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { active } from './active';
import { toElasticsearchQuery } from '@kbn/es-query';
import { savedObjectsClientMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { SavedObjectsFindResponse } from '@kbn/core/server';
import {
  MaintenanceWindowClientContext,
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
} from '../../../common';

const savedObjectsClient = savedObjectsClientMock.create();

const mockContext: jest.Mocked<MaintenanceWindowClientContext> = {
  logger: loggingSystemMock.create().get(),
  getModificationMetadata: jest.fn(),
  savedObjectsClient,
};

describe('MaintenanceWindowClient - active', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should return true if there are active maintenance windows', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-02-26T00:00:00.000Z'));

    savedObjectsClient.find.mockResolvedValueOnce({
      aggregations: {
        maintenanceWindow: {
          buckets: [
            {
              key_as_string: 1679959537,
              key: 1679959537,
              doc_count: 1,
            },
            {
              key_as_string: 1679959537,
              key: 1679959537,
              doc_count: 2,
            },
            {
              key_as_string: 1679959537,
              key: 1679959537,
              doc_count: 3,
            },
          ],
        },
      },
    } as unknown as SavedObjectsFindResponse);

    const startDate = new Date().toISOString();
    const endDate = moment.utc(startDate).add(1, 'h').toISOString();

    const result = await active(mockContext, {
      start: startDate,
      interval: '1h',
    });

    const findCallParams = savedObjectsClient.find.mock.calls[0][0];

    expect(findCallParams.type).toEqual(MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE);
    expect(findCallParams.aggs?.maintenanceWindow.date_histogram).toEqual(
      expect.objectContaining({
        field: 'maintenance-window.attributes.events',
        fixed_interval: '1h',
        extended_bounds: {
          min: startDate,
          max: endDate,
        },
        hard_bounds: {
          min: startDate,
          max: endDate,
        },
      })
    );

    expect(toElasticsearchQuery(findCallParams.filter)).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "filter": Array [
            Object {
              "bool": Object {
                "minimum_should_match": 1,
                "should": Array [
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
    expect(result).toEqual(true);
  });

  it('should return false if there are no active maintenance windows', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-02-26T00:00:00.000Z'));

    savedObjectsClient.find.mockResolvedValueOnce({
      aggregations: {
        maintenanceWindow: {
          buckets: [
            {
              key_as_string: 1679959537,
              key: 1679959537,
              doc_count: 0,
            },
            {
              key_as_string: 1679959537,
              key: 1679959537,
              doc_count: 0,
            },
          ],
        },
      },
    } as unknown as SavedObjectsFindResponse);

    const startDate = new Date().toISOString();
    const endDate = moment.utc(startDate).add(4, 'd').toISOString();

    const result = await active(mockContext, {
      start: startDate,
      interval: '4d',
    });

    const findCallParams = savedObjectsClient.find.mock.calls[0][0];

    expect(findCallParams.type).toEqual(MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE);
    expect(findCallParams.aggs?.maintenanceWindow.date_histogram).toEqual(
      expect.objectContaining({
        field: 'maintenance-window.attributes.events',
        fixed_interval: '4d',
        extended_bounds: {
          min: startDate,
          max: endDate,
        },
        hard_bounds: {
          min: startDate,
          max: endDate,
        },
      })
    );
    expect(toElasticsearchQuery(findCallParams.filter)).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "filter": Array [
            Object {
              "bool": Object {
                "minimum_should_match": 1,
                "should": Array [
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
    expect(result).toEqual(false);
  });

  it('should log and return false is an error is thrown', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-02-26T00:00:00.000Z'));

    savedObjectsClient.find.mockRejectedValueOnce('something went wrong');

    const startDate = new Date().toISOString();

    const result = await active(mockContext, {
      start: startDate,
      interval: '4d',
    });

    expect(mockContext.logger.error).toHaveBeenLastCalledWith(
      'Failed to find active maintenance window by interval: 4d with start date: 2023-02-26T00:00:00.000Z, Error: something went wrong'
    );
    expect(result).toEqual(false);
  });
});
