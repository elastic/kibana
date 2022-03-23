/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  savedObjectsRepositoryMock,
  loggingSystemMock,
} from '../../../../../../src/core/server/mocks';
import { getPushedTelemetryData } from './pushes';

describe('pushes', () => {
  describe('getPushedTelemetryData', () => {
    const logger = loggingSystemMock.createLogger();
    const savedObjectsClient = savedObjectsRepositoryMock.create();
    savedObjectsClient.find.mockResolvedValue({
      total: 5,
      saved_objects: [],
      per_page: 1,
      page: 1,
      aggregations: {
        references: { cases: { max: { value: 1 } } },
      },
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('it returns the correct res', async () => {
      const res = await getPushedTelemetryData({ savedObjectsClient, logger });
      expect(res).toEqual({
        all: {
          maxOnACase: 1,
          total: 5,
        },
      });
    });

    it('should call find with correct arguments', async () => {
      await getPushedTelemetryData({ savedObjectsClient, logger });
      expect(savedObjectsClient.find).toBeCalledWith({
        aggs: {
          references: {
            nested: {
              path: 'cases-user-actions.references',
            },
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
          },
        },
        filter: {
          type: 'function',
          function: 'or',
          arguments: [
            {
              arguments: [
                {
                  type: 'literal',
                  value: 'cases-user-actions.attributes.type',
                },
                {
                  type: 'literal',
                  value: 'pushed',
                },
                {
                  type: 'literal',
                  value: false,
                },
              ],
              function: 'is',
              type: 'function',
            },
          ],
        },
        page: 0,
        perPage: 0,
        type: 'cases-user-actions',
      });
    });
  });
});
