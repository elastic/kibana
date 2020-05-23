/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnomaliesResponse } from './get_service_map';
import { addAnomaliesToServicesData } from './ml_helpers';

describe('addAnomaliesToServicesData', () => {
  it('adds anomalies to services data', () => {
    const servicesData = [
      {
        'service.name': 'opbeans-ruby',
        'agent.name': 'ruby',
        'service.environment': null,
        'service.framework.name': 'Ruby on Rails'
      },
      {
        'service.name': 'opbeans-java',
        'agent.name': 'java',
        'service.environment': null,
        'service.framework.name': null
      }
    ];

    const anomaliesResponse = {
      aggregations: {
        jobs: {
          buckets: [
            {
              key: 'opbeans-ruby-request-high_mean_response_time',
              max_score: { value: 50 }
            },
            {
              key: 'opbeans-java-request-high_mean_response_time',
              max_score: { value: 100 }
            }
          ]
        }
      }
    };

    const result = [
      {
        'service.name': 'opbeans-ruby',
        'agent.name': 'ruby',
        'service.environment': null,
        'service.framework.name': 'Ruby on Rails',
        max_score: 50,
        severity: 'major'
      },
      {
        'service.name': 'opbeans-java',
        'agent.name': 'java',
        'service.environment': null,
        'service.framework.name': null,
        max_score: 100,
        severity: 'critical'
      }
    ];

    expect(
      addAnomaliesToServicesData(
        servicesData,
        (anomaliesResponse as unknown) as AnomaliesResponse
      )
    ).toEqual(result);
  });
});
