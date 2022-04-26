/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { getUserActionsTelemetryData } from './user_actions';

describe('user_actions', () => {
  describe('getUserActionsTelemetryData', () => {
    const logger = loggingSystemMock.createLogger();
    const savedObjectsClient = savedObjectsRepositoryMock.create();
    savedObjectsClient.find.mockResolvedValue({
      total: 5,
      saved_objects: [],
      per_page: 1,
      page: 1,
      aggregations: {
        counts: {
          buckets: [
            { doc_count: 1, key: 1 },
            { doc_count: 2, key: 2 },
            { doc_count: 3, key: 3 },
          ],
        },
        references: { cases: { max: { value: 1 } } },
      },
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('it returns the correct res', async () => {
      const res = await getUserActionsTelemetryData({ savedObjectsClient, logger });
      expect(res).toEqual({
        all: {
          total: 5,
          daily: 3,
          weekly: 2,
          monthly: 1,
          maxOnACase: 1,
        },
      });
    });

    it('should call find with correct arguments', async () => {
      await getUserActionsTelemetryData({ savedObjectsClient, logger });
      expect(savedObjectsClient.find).toBeCalledWith({
        aggs: {
          counts: {
            date_range: {
              field: 'cases-user-actions.attributes.created_at',
              format: 'dd/MM/YYYY',
              ranges: [
                {
                  from: 'now-1d',
                  to: 'now',
                },
                {
                  from: 'now-1w',
                  to: 'now',
                },
                {
                  from: 'now-1M',
                  to: 'now',
                },
              ],
            },
          },
          references: {
            aggregations: {
              cases: {
                aggregations: {
                  ids: {
                    terms: {
                      field: 'cases-user-actions.references.id',
                    },
                  },
                  max: {
                    max_bucket: {
                      buckets_path: 'ids._count',
                    },
                  },
                },
                filter: {
                  term: {
                    'cases-user-actions.references.type': 'cases',
                  },
                },
              },
            },
            nested: {
              path: 'cases-user-actions.references',
            },
          },
        },
        filter: undefined,
        page: 0,
        perPage: 0,
        type: 'cases-user-actions',
      });
    });
  });
});
