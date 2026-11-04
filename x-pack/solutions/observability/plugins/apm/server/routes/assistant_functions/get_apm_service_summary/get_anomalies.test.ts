/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { anomalySearch } from '../../../lib/anomaly_detection/anomaly_search';
import { getMlJobsWithAPMGroup } from '../../../lib/anomaly_detection/get_ml_jobs_with_apm_group';
import { getAnomalies, getAnomaliesWithContext } from './get_anomalies';

jest.mock('../../../lib/anomaly_detection/anomaly_search', () => ({
  anomalySearch: jest.fn(),
}));
jest.mock('../../../lib/anomaly_detection/get_ml_jobs_with_apm_group', () => ({
  getMlJobsWithAPMGroup: jest.fn(),
}));

const anomalySearchMock = anomalySearch as jest.MockedFunction<typeof anomalySearch>;
const getMlJobsWithAPMGroupMock = getMlJobsWithAPMGroup as jest.MockedFunction<
  typeof getMlJobsWithAPMGroup
>;

const anomalyResponse = {
  aggregations: {
    by_timeseries_id: {
      buckets: [
        {
          key: {
            jobId: 'apm-production-throughput',
            detectorIndex: 1,
            serviceName: 'checkout',
            transactionType: 'request',
          },
          record_scores: {
            top_anomaly: {
              top: [{ metrics: { record_score: 80, actual: 12, timestamp: 1_700_000_000_000 } }],
            },
          },
          model_lower: { value: 4 },
          model_upper: { value: 9 },
        },
      ],
    },
  },
};

describe('getAnomalies', () => {
  const logger = loggingSystemMock.createLogger();
  const mlClient = { anomalyDetectors: {}, mlSystem: { mlAnomalySearch: jest.fn() } } as never;

  beforeEach(() => {
    getMlJobsWithAPMGroupMock.mockResolvedValue([
      {
        jobId: 'apm-production-throughput',
        environment: 'production',
        version: 3,
        bucketSpan: '15m',
      } as never,
    ]);
    anomalySearchMock.mockResolvedValue(anomalyResponse as never);
  });

  it('keeps job and detector identity off the assistant anomaly records', async () => {
    const anomalies = await getAnomalies({
      serviceName: 'checkout',
      environment: 'production',
      start: 0,
      end: 1,
      mlClient,
      logger,
    });

    expect(anomalies).toEqual([
      expect.objectContaining({
        metricName: 'transactionThroughput',
        'service.name': 'checkout',
      }),
    ]);
    expect(anomalies[0]).not.toHaveProperty('jobId');
    expect(anomalies[0]).not.toHaveProperty('detectorIndex');
  });

  it('returns the job and detector that produced each anomaly', async () => {
    const anomalies = await getAnomaliesWithContext({
      serviceName: 'checkout',
      environment: 'production',
      start: 0,
      end: 1,
      mlClient,
      logger,
    });

    expect(anomalies[0]).toMatchObject({
      jobId: 'apm-production-throughput',
      detectorIndex: 1,
      metricName: 'transactionThroughput',
    });
  });
});
