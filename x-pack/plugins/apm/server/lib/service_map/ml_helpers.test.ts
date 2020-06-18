/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServiceAnomalies } from './get_service_map';
import { addAnomaliesDataToNodes } from './ml_helpers';

describe('addAnomaliesDataToNodes', () => {
  it('adds anomalies to nodes', () => {
    const nodes = [
      {
        'service.name': 'opbeans-ruby',
        'agent.name': 'ruby',
        'service.environment': null,
      },
      {
        'service.name': 'opbeans-java',
        'agent.name': 'java',
        'service.environment': null,
      },
    ];

    const serviceAnomalies: ServiceAnomalies = [
      {
        jobId: 'opbeans-ruby-request-high_mean_response_time',
        serviceName: 'opbeans-ruby',
        transactionType: 'request',
        anomalyScore: 50,
        timestamp: 1591351200000,
        actual: 2000,
        typical: 1000,
      },
      {
        jobId: 'opbeans-java-request-high_mean_response_time',
        serviceName: 'opbeans-java',
        transactionType: 'request',
        anomalyScore: 100,
        timestamp: 1591351200000,
        actual: 9000,
        typical: 3000,
      },
    ];

    const result = [
      {
        'service.name': 'opbeans-ruby',
        'agent.name': 'ruby',
        'service.environment': null,
        anomaly_score: 50,
        anomaly_severity: 'major',
        actual_value: 2000,
        typical_value: 1000,
        ml_job_id: 'opbeans-ruby-request-high_mean_response_time',
      },
      {
        'service.name': 'opbeans-java',
        'agent.name': 'java',
        'service.environment': null,
        anomaly_score: 100,
        anomaly_severity: 'critical',
        actual_value: 9000,
        typical_value: 3000,
        ml_job_id: 'opbeans-java-request-high_mean_response_time',
      },
    ];

    expect(
      addAnomaliesDataToNodes(
        nodes,
        (serviceAnomalies as unknown) as ServiceAnomalies
      )
    ).toEqual(result);
  });
});
