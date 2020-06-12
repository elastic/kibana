/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getApmMlJobCategory } from './get_service_anomalies';
import { Job as AnomalyDetectionJob } from '../../../../ml/server';

describe('getApmMlJobCategory', () => {
  it('should match service names with different casings', () => {
    const mlJob = {
      job_id: 'testservice-request-high_mean_response_time',
      groups: ['apm', 'testservice', 'request'],
    } as AnomalyDetectionJob;
    const serviceNames = ['testService'];
    const apmMlJobCategory = getApmMlJobCategory(mlJob, serviceNames);

    expect(apmMlJobCategory).toEqual({
      jobId: 'testservice-request-high_mean_response_time',
      serviceName: 'testService',
      transactionType: 'request',
    });
  });

  it('should match service names with spaces', () => {
    const mlJob = {
      job_id: 'test_service-request-high_mean_response_time',
      groups: ['apm', 'test_service', 'request'],
    } as AnomalyDetectionJob;
    const serviceNames = ['Test Service'];
    const apmMlJobCategory = getApmMlJobCategory(mlJob, serviceNames);

    expect(apmMlJobCategory).toEqual({
      jobId: 'test_service-request-high_mean_response_time',
      serviceName: 'Test Service',
      transactionType: 'request',
    });
  });
});
