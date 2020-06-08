/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnomaliesResponse } from './get_service_map';
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

    const anomaliesResponse = {
      aggregations: {
        jobs: {
          buckets: [
            {
              key: 'opbeans-ruby-request-high_mean_response_time',
              top_score_hits: {
                hits: {
                  hits: [
                    {
                      _source: {
                        record_score: 50,
                        actual: [2000],
                        typical: [1000],
                        job_id: 'opbeans-ruby-request-high_mean_response_time',
                      },
                    },
                  ],
                },
              },
            },
            {
              key: 'opbeans-java-request-high_mean_response_time',
              top_score_hits: {
                hits: {
                  hits: [
                    {
                      _source: {
                        record_score: 100,
                        actual: [9000],
                        typical: [3000],
                        job_id: 'opbeans-java-request-high_mean_response_time',
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    };

    const result = [
      {
        'service.name': 'opbeans-ruby',
        'agent.name': 'ruby',
        'service.environment': null,
        max_score: 50,
        severity: 'major',
        actual_value: 2000,
        typical_value: 1000,
        job_id: 'opbeans-ruby-request-high_mean_response_time',
      },
      {
        'service.name': 'opbeans-java',
        'agent.name': 'java',
        'service.environment': null,
        max_score: 100,
        severity: 'critical',
        actual_value: 9000,
        typical_value: 3000,
        job_id: 'opbeans-java-request-high_mean_response_time',
      },
    ];

    expect(
      addAnomaliesDataToNodes(
        nodes,
        (anomaliesResponse as unknown) as AnomaliesResponse
      )
    ).toEqual(result);
  });
});
