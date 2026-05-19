/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getServiceAnomalyScoreForService } from './get_service_anomaly_score_for_service';
import * as getServiceAnomaliesModule from '../../service_map/get_service_anomalies';

describe('getServiceAnomalyScoreForService', () => {
  const mlClient = {} as unknown as Parameters<
    typeof getServiceAnomalyScoreForService
  >[0]['mlClient'];

  beforeEach(() => {
    jest.spyOn(getServiceAnomaliesModule, 'getServiceAnomalies').mockReset();
  });

  it('returns the anomaly score for the matching service', async () => {
    jest.spyOn(getServiceAnomaliesModule, 'getServiceAnomalies').mockResolvedValue({
      mlJobIds: ['apm-job'],
      serviceAnomalies: [
        {
          serviceName: 'other',
          anomalyScore: 10,
          jobId: 'apm-job',
          transactionType: 'request',
          actualValue: 1,
        },
        {
          serviceName: 'my-service',
          anomalyScore: 88.5,
          jobId: 'apm-job',
          transactionType: 'request',
          actualValue: 2,
        },
      ],
    });

    const result = await getServiceAnomalyScoreForService({
      mlClient,
      environment: 'ENVIRONMENT_ALL',
      start: 0,
      end: 1,
      serviceName: 'my-service',
    });

    expect(result).toEqual({ anomalyScore: 88.5 });
    expect(getServiceAnomaliesModule.getServiceAnomalies).toHaveBeenCalledWith(
      expect.objectContaining({
        exactServiceName: 'my-service',
      })
    );
  });

  it('returns empty object when the service is not in anomaly results', async () => {
    jest.spyOn(getServiceAnomaliesModule, 'getServiceAnomalies').mockResolvedValue({
      mlJobIds: [],
      serviceAnomalies: [
        {
          serviceName: 'other',
          anomalyScore: 1,
          jobId: 'apm-job',
          transactionType: 'request',
          actualValue: 1,
        },
      ],
    });

    const result = await getServiceAnomalyScoreForService({
      mlClient,
      environment: 'ENVIRONMENT_ALL',
      start: 0,
      end: 1,
      serviceName: 'missing',
    });

    expect(result).toEqual({});
  });
});
