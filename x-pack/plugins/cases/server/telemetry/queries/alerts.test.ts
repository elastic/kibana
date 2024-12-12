/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { getAlertsTelemetryData } from './alerts';
import { TelemetrySavedObjectsClient } from '../telemetry_saved_objects_client';

describe('alerts', () => {
  const logger = loggingSystemMock.createLogger();

  describe('getAlertsTelemetryData', () => {
    const savedObjectsClient = savedObjectsRepositoryMock.create();
    const telemetrySavedObjectsClient = new TelemetrySavedObjectsClient(savedObjectsClient);

    savedObjectsClient.find.mockResolvedValue({
      total: 3,
      saved_objects: [],
      per_page: 1,
      page: 1,
      aggregations: {
        counts: {
          buckets: [
            { topAlertsPerBucket: { value: 12 } },
            { topAlertsPerBucket: { value: 5 } },
            { topAlertsPerBucket: { value: 3 } },
          ],
        },
        references: { cases: { max: { value: 1 } } },
        uniqueAlertCommentsCount: { value: 5 },
      },
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('it returns the correct res', async () => {
      const res = await getAlertsTelemetryData({
        savedObjectsClient: telemetrySavedObjectsClient,
        logger,
      });

      expect(res).toEqual({
        all: {
          total: 5,
          daily: 3,
          weekly: 5,
          monthly: 12,
          maxOnACase: 1,
        },
      });
    });

    it('should call find with correct arguments', async () => {
      await getAlertsTelemetryData({ savedObjectsClient: telemetrySavedObjectsClient, logger });
      expect(savedObjectsClient.find).toBeCalledWith({
        aggs: {
          counts: {
            date_range: {
              field: 'cases-comments.attributes.created_at',
              format: 'dd/MM/yyyy',
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
            aggregations: {
              topAlertsPerBucket: {
                cardinality: {
                  field: 'cases-comments.attributes.alertId',
                },
              },
            },
          },
          references: {
            aggregations: {
              cases: {
                aggregations: {
                  ids: {
                    terms: {
                      field: 'cases-comments.references.id',
                    },
                    aggregations: {
                      reverse: {
                        reverse_nested: {},
                        aggregations: {
                          topAlerts: {
                            cardinality: {
                              field: 'cases-comments.attributes.alertId',
                            },
                          },
                        },
                      },
                    },
                  },
                  max: {
                    max_bucket: {
                      buckets_path: 'ids>reverse.topAlerts',
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
          uniqueAlertCommentsCount: {
            cardinality: {
              field: 'cases-comments.attributes.alertId',
            },
          },
        },
        filter: {
          arguments: [
            {
              type: 'literal',
              value: 'cases-comments.attributes.type',
              isQuoted: false,
            },
            {
              type: 'literal',
              value: 'alert',
              isQuoted: false,
            },
          ],
          function: 'is',
          type: 'function',
        },
        page: 0,
        perPage: 0,
        type: 'cases-comments',
        namespaces: ['*'],
      });
    });
  });
});
