/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '../../../../../src/core/server/elasticsearch/client/mocks';
import {
  getTotalCountAggregations,
  getTotalCountInUse,
  getExecutionsPerDayCount,
} from './alerts_telemetry';

describe('alerts telemetry', () => {
  test('getTotalCountInUse should replace first "." symbol to "__" in alert types names', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockReturnValue(
      // @ts-expect-error @elastic/elasticsearch Aggregate only allows unknown values
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        aggregations: {
          byAlertTypeId: {
            value: {
              ruleTypes: {
                '.index-threshold': 2,
                'logs.alert.document.count': 1,
                'document.test.': 1,
              },
              namespaces: {
                default: 1,
              },
            },
          },
        },
        hits: {
          hits: [],
        },
      })
    );

    const telemetry = await getTotalCountInUse(mockEsClient, 'test');

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);

    expect(telemetry).toMatchInlineSnapshot(`
Object {
  "countByType": Object {
    "__index-threshold": 2,
    "document.test__": 1,
    "logs.alert.document.count": 1,
  },
  "countNamespaces": 1,
  "countTotal": 4,
}
`);
  });

  test('getTotalCountAggregations should return min/max connectors in use', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockReturnValue(
      // @ts-expect-error @elastic/elasticsearch Aggregate only allows unknown values
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        aggregations: {
          byAlertTypeId: {
            value: {
              ruleTypes: {
                '.index-threshold': 2,
                'logs.alert.document.count': 1,
                'document.test.': 1,
              },
            },
          },
          max_throttle_time: { value: 60 },
          min_throttle_time: { value: 0 },
          avg_throttle_time: { value: 30 },
          max_interval_time: { value: 10 },
          min_interval_time: { value: 1 },
          avg_interval_time: { value: 4.5 },
          max_actions_count: { value: 4 },
          min_actions_count: { value: 0 },
          avg_actions_count: { value: 2.5 },
        },
        hits: {
          hits: [],
        },
      })
    );

    const telemetry = await getTotalCountAggregations(mockEsClient, 'test');

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);

    expect(telemetry).toMatchInlineSnapshot(`
Object {
  "connectors_per_alert": Object {
    "avg": 2.5,
    "max": 4,
    "min": 0,
  },
  "count_by_type": Object {
    "__index-threshold": 2,
    "document.test__": 1,
    "logs.alert.document.count": 1,
  },
  "count_rules_namespaces": 0,
  "count_total": 4,
  "schedule_time": Object {
    "avg": "4.5s",
    "max": "10s",
    "min": "1s",
  },
  "schedule_time_number_s": Object {
    "avg": 4.5,
    "max": 10,
    "min": 1,
  },
  "throttle_time": Object {
    "avg": "30s",
    "max": "60s",
    "min": "0s",
  },
  "throttle_time_number_s": Object {
    "avg": 30,
    "max": 60,
    "min": 0,
  },
}
`);
  });

  test('getTotalExecutionsCount should return execution aggregations for total count, count by rule type and number of failed executions', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockReturnValue(
      // @ts-expect-error @elastic/elasticsearch Aggregate only allows unknown values
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        aggregations: {
          byRuleTypeId: {
            value: {
              ruleTypes: {
                '.index-threshold': 2,
                'logs.alert.document.count': 1,
                'document.test.': 1,
              },
              ruleTypesDuration: {
                '.index-threshold': 2087868,
                'logs.alert.document.count': 1675765,
                'document.test.': 17687687,
              },
            },
          },
          failuresByReason: {
            value: {
              reasons: {
                unknown: {
                  '.index-threshold': 2,
                  'logs.alert.document.count': 1,
                  'document.test.': 1,
                },
              },
            },
          },
          avgDuration: { value: 10 },
        },
        hits: {
          hits: [],
        },
      })
    );

    const telemetry = await getExecutionsPerDayCount(mockEsClient, 'test');

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);

    expect(telemetry).toStrictEqual({
      avgExecutionTime: 0,
      avgExecutionTimeByType: {
        '__index-threshold': 1043934,
        'document.test__': 17687687,
        'logs.alert.document.count': 1675765,
      },
      countByType: {
        '__index-threshold': 2,
        'document.test__': 1,
        'logs.alert.document.count': 1,
      },
      countFailuresByReason: {
        unknown: 4,
      },
      countFailuresByReasonByType: {
        unknown: {
          '.index-threshold': 2,
          'document.test.': 1,
          'logs.alert.document.count': 1,
        },
      },
      countTotal: 4,
      countTotalFailures: 4,
    });
  });
});
