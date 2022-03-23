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
import { getConnectorsTelemetryData } from './connectors';

describe('getConnectorsTelemetryData', () => {
  describe('getConnectorsTelemetryData', () => {
    const logger = loggingSystemMock.createLogger();
    const savedObjectsClient = savedObjectsRepositoryMock.create();

    const mockFind = (aggs: Record<string, unknown>) => {
      savedObjectsClient.find.mockResolvedValueOnce({
        total: 5,
        saved_objects: [],
        per_page: 1,
        page: 1,
        aggregations: {
          ...aggs,
        },
      });
    };

    const mockResponse = () => {
      mockFind({ references: { referenceType: { referenceAgg: { value: 1 } } } });
      mockFind({ references: { cases: { max: { value: 2 } } } });
      mockFind({ references: { referenceType: { referenceAgg: { value: 3 } } } });
      mockFind({ references: { referenceType: { referenceAgg: { value: 4 } } } });
      mockFind({ references: { referenceType: { referenceAgg: { value: 5 } } } });
      mockFind({ references: { referenceType: { referenceAgg: { value: 6 } } } });
      mockFind({ references: { referenceType: { referenceAgg: { value: 7 } } } });
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('it returns the correct res', async () => {
      mockResponse();

      const res = await getConnectorsTelemetryData({ savedObjectsClient, logger });
      expect(res).toEqual({
        all: {
          all: {
            totalAttached: 1,
          },
          itsm: {
            totalAttached: 3,
          },
          sir: {
            totalAttached: 4,
          },
          jira: {
            totalAttached: 5,
          },
          resilient: {
            totalAttached: 6,
          },
          swimlane: {
            totalAttached: 7,
          },
          maxAttachedToACase: 2,
        },
      });
    });

    it('should call find with correct arguments', async () => {
      mockResponse();

      await getConnectorsTelemetryData({ savedObjectsClient, logger });

      expect(savedObjectsClient.find.mock.calls[0][0]).toEqual({
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
                    'cases-user-actions.references.type': 'action',
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

      expect(savedObjectsClient.find.mock.calls[1][0]).toEqual({
        aggs: {
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
        filter: {
          type: 'function',
          function: 'or',
          arguments: [
            {
              type: 'function',
              function: 'is',
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
            },
          ],
        },
        page: 0,
        perPage: 0,
        type: 'cases-user-actions',
      });

      for (const [index, connector] of [
        '.servicenow',
        '.servicenow-sir',
        '.jira',
        '.resilient',
        '.swimlane',
      ].entries()) {
        const callIndex = index + 2;

        expect(savedObjectsClient.find.mock.calls[callIndex][0]).toEqual({
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
                      'cases-user-actions.references.type': 'action',
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
            type: 'function',
            function: 'or',
            arguments: [
              {
                arguments: [
                  {
                    type: 'literal',
                    value: 'cases-user-actions.attributes.payload.connector.type',
                  },
                  {
                    type: 'literal',
                    value: connector,
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
      }
    });
  });
});
