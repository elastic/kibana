/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsFindResponse } from 'kibana/server';
import {
  savedObjectsRepositoryMock,
  loggingSystemMock,
} from '../../../../../../src/core/server/mocks';
import { getCasesTelemetryData } from './cases';

describe('getCasesTelemetryData', () => {
  describe('getCasesTelemetryData', () => {
    const logger = loggingSystemMock.createLogger();
    const savedObjectsClient = savedObjectsRepositoryMock.create();

    const mockFind = (
      aggs: Record<string, unknown> = {},
      so: SavedObjectsFindResponse['saved_objects'] = []
    ) => {
      savedObjectsClient.find.mockResolvedValueOnce({
        total: 5,
        saved_objects: so,
        per_page: 1,
        page: 1,
        aggregations: {
          ...aggs,
        },
      });
    };

    const mockSavedObjectResponse = (attributes: Record<string, unknown>) => {
      mockFind({}, [
        {
          attributes: { ...attributes },
          score: 1,
          id: 'test',
          references: [],
          type: 'cases',
        },
      ]);
    };

    const mockResponse = () => {
      const counts = {
        buckets: [
          { doc_count: 1, key: 1 },
          { doc_count: 2, key: 2 },
          { doc_count: 3, key: 3 },
        ],
      };

      mockFind({
        users: { value: 1 },
        tags: { value: 2 },
        counts,
        securitySolution: { counts },
        observability: { counts },
        cases: { counts },
        syncAlerts: {
          buckets: [
            {
              key: 0,
              doc_count: 1,
            },
            {
              key: 1,
              doc_count: 1,
            },
          ],
        },
        status: {
          buckets: [
            {
              key: 'open',
              doc_count: 2,
            },
          ],
        },
        totalsByOwner: {
          buckets: [
            {
              key: 'observability',
              doc_count: 1,
            },
            {
              key: 'securitySolution',
              doc_count: 1,
            },
            {
              key: 'cases',
              doc_count: 1,
            },
          ],
        },
      });
      mockFind({ participants: { value: 2 } });
      mockFind({ references: { referenceType: { referenceAgg: { value: 3 } } } });
      mockFind({ references: { referenceType: { referenceAgg: { value: 4 } } } });
      mockSavedObjectResponse({
        created_at: '2022-03-08T12:24:11.429Z',
      });
      mockSavedObjectResponse({
        updated_at: '2022-03-08T12:24:11.429Z',
      });
      mockSavedObjectResponse({
        closed_at: '2022-03-08T12:24:11.429Z',
      });
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('it returns the correct res', async () => {
      mockResponse();

      const res = await getCasesTelemetryData({ savedObjectsClient, logger });
      expect(res).toEqual({
        all: {
          total: 5,
          daily: 3,
          weekly: 2,
          monthly: 1,
          latestDates: {
            closedAt: '2022-03-08T12:24:11.429Z',
            createdAt: '2022-03-08T12:24:11.429Z',
            updatedAt: '2022-03-08T12:24:11.429Z',
          },
          status: {
            closed: 0,
            inProgress: 0,
            open: 2,
          },
          syncAlertsOff: 1,
          syncAlertsOn: 1,
          totalParticipants: 2,
          totalTags: 2,
          totalUsers: 1,
          totalWithAlerts: 3,
          totalWithConnectors: 4,
        },
        main: {
          total: 1,
          daily: 3,
          weekly: 2,
          monthly: 1,
        },
        obs: {
          total: 1,
          daily: 3,
          weekly: 2,
          monthly: 1,
        },
        sec: {
          total: 1,
          daily: 3,
          weekly: 2,
          monthly: 1,
        },
      });
    });

    it('should call find with correct arguments', async () => {
      mockResponse();

      await getCasesTelemetryData({ savedObjectsClient, logger });

      expect(savedObjectsClient.find.mock.calls[0][0]).toEqual({
        aggs: {
          cases: {
            aggs: {
              counts: {
                date_range: {
                  field: 'cases.attributes.created_at',
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
            },
            filter: {
              term: {
                'cases.attributes.owner': 'cases',
              },
            },
          },
          counts: {
            date_range: {
              field: 'cases.attributes.created_at',
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
          observability: {
            aggs: {
              counts: {
                date_range: {
                  field: 'cases.attributes.created_at',
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
            },
            filter: {
              term: {
                'cases.attributes.owner': 'observability',
              },
            },
          },
          securitySolution: {
            aggs: {
              counts: {
                date_range: {
                  field: 'cases.attributes.created_at',
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
            },
            filter: {
              term: {
                'cases.attributes.owner': 'securitySolution',
              },
            },
          },
          status: {
            terms: {
              field: 'cases.attributes.status',
            },
          },
          syncAlerts: {
            terms: {
              field: 'cases.attributes.settings.syncAlerts',
            },
          },
          tags: {
            cardinality: {
              field: 'cases.attributes.tags',
            },
          },
          totalsByOwner: {
            terms: {
              field: 'cases.attributes.owner',
            },
          },
          users: {
            cardinality: {
              field: 'cases.attributes.created_by.username',
            },
          },
        },
        page: 0,
        perPage: 0,
        type: 'cases',
      });

      expect(savedObjectsClient.find.mock.calls[1][0]).toEqual({
        aggs: {
          participants: {
            cardinality: {
              field: 'cases-comments.attributes.created_by.username',
            },
          },
        },
        page: 0,
        perPage: 0,
        type: 'cases-comments',
      });

      expect(savedObjectsClient.find.mock.calls[2][0]).toEqual({
        aggs: {
          references: {
            aggregations: {
              referenceType: {
                aggregations: {
                  referenceAgg: {
                    cardinality: {
                      field: 'cases-comments.references.id',
                    },
                  },
                },
                filter: {
                  term: {
                    'cases-comments.references.type': 'cases',
                  },
                },
              },
            },
            nested: {
              path: 'cases-comments.references',
            },
          },
        },
        filter: {
          arguments: [
            {
              type: 'literal',
              value: 'cases-comments.attributes.type',
            },
            {
              type: 'literal',
              value: 'alert',
            },
            {
              type: 'literal',
              value: false,
            },
          ],
          function: 'is',
          type: 'function',
        },
        page: 0,
        perPage: 0,
        type: 'cases-comments',
      });

      expect(savedObjectsClient.find.mock.calls[3][0]).toEqual({
        aggs: {
          references: {
            aggregations: {
              referenceType: {
                aggregations: {
                  referenceAgg: {
                    cardinality: {
                      field: 'cases-user-actions.references.id',
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
        filter: {
          arguments: [
            {
              type: 'literal',
              value: 'cases-user-actions.attributes.type',
            },
            {
              type: 'literal',
              value: 'connector',
            },
            {
              type: 'literal',
              value: false,
            },
          ],
          function: 'is',
          type: 'function',
        },
        page: 0,
        perPage: 0,
        type: 'cases-user-actions',
      });

      for (const [index, sortField] of ['created_at', 'updated_at', 'closed_at'].entries()) {
        const callIndex = index + 4;

        expect(savedObjectsClient.find.mock.calls[callIndex][0]).toEqual({
          page: 1,
          perPage: 1,
          sortField,
          sortOrder: 'desc',
          type: 'cases',
        });
      }
    });
  });
});
