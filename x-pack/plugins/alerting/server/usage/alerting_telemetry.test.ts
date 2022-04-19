/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '@kbn/core/server/elasticsearch/client/mocks';
import {
  getTotalCountAggregations,
  getTotalCountInUse,
  getExecutionsPerDayCount,
  getExecutionTimeoutsPerDayCount,
  getFailedAndUnrecognizedTasksPerDay,
  parsePercentileAggsByRuleType,
} from './alerting_telemetry';

describe('alerting telemetry', () => {
  test('getTotalCountInUse should replace "." symbols with "__" in rule types names', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockResponse(
      // @ts-expect-error @elastic/elasticsearch Aggregate only allows unknown values
      {
        aggregations: {
          byRuleTypeId: {
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
      }
    );

    const telemetry = await getTotalCountInUse(mockEsClient, 'test');

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);

    expect(telemetry).toMatchInlineSnapshot(`
Object {
  "countByType": Object {
    "__index-threshold": 2,
    "document__test__": 1,
    "logs__alert__document__count": 1,
  },
  "countNamespaces": 1,
  "countTotal": 4,
}
`);
  });

  test('getTotalCountAggregations should return min/max connectors in use', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockResponse(
      // @ts-expect-error @elastic/elasticsearch Aggregate only allows unknown values
      {
        aggregations: {
          byRuleTypeId: {
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
      }
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
    "document__test__": 1,
    "logs__alert__document__count": 1,
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

  test('getExecutionsPerDayCount should return execution aggregations for total count, count by rule type and number of failed executions', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockResponse(
      // @ts-expect-error @elastic/elasticsearch Aggregate only allows unknown values
      {
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
              ruleTypesEsSearchDuration: {
                '.index-threshold': 23,
                'logs.alert.document.count': 526,
                'document.test.': 534,
              },
              ruleTypesTotalSearchDuration: {
                '.index-threshold': 62,
                'logs.alert.document.count': 588,
                'document.test.': 637,
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
          avgEsSearchDuration: {
            value: 25.785714285714285,
          },
          avgTotalSearchDuration: {
            value: 30.642857142857142,
          },
          percentileScheduledActions: {
            values: {
              '50.0': 4.0,
              '90.0': 26.0,
              '99.0': 26.0,
            },
          },
          percentileAlerts: {
            values: {
              '50.0': 10.0,
              '90.0': 22.0,
              '99.0': 22.0,
            },
          },
          aggsByType: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: '.index-threshold',
                doc_count: 149,
                percentileScheduledActions: {
                  values: {
                    '50.0': 4.0,
                    '90.0': 26.0,
                    '99.0': 26.0,
                  },
                },
                percentileAlerts: {
                  values: {
                    '50.0': 10.0,
                    '90.0': 22.0,
                    '99.0': 22.0,
                  },
                },
              },
              {
                key: 'logs.alert.document.count',
                doc_count: 1,
                percentileScheduledActions: {
                  values: {
                    '50.0': 10.0,
                    '90.0': 10.0,
                    '99.0': 10.0,
                  },
                },
                percentileAlerts: {
                  values: {
                    '50.0': 5.0,
                    '90.0': 13.0,
                    '99.0': 13.0,
                  },
                },
              },
            ],
          },
        },
        hits: {
          hits: [],
        },
      }
    );

    const telemetry = await getExecutionsPerDayCount(mockEsClient, 'test');

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);

    expect(telemetry).toStrictEqual({
      avgEsSearchDuration: 26,
      avgEsSearchDurationByType: {
        '__index-threshold': 12,
        document__test__: 534,
        logs__alert__document__count: 526,
      },
      avgExecutionTime: 0,
      avgExecutionTimeByType: {
        '__index-threshold': 1043934,
        document__test__: 17687687,
        logs__alert__document__count: 1675765,
      },
      avgTotalSearchDuration: 31,
      avgTotalSearchDurationByType: {
        '__index-threshold': 31,
        document__test__: 637,
        logs__alert__document__count: 588,
      },
      countByType: {
        '__index-threshold': 2,
        document__test__: 1,
        logs__alert__document__count: 1,
      },
      countFailuresByReason: {
        unknown: 4,
      },
      countFailuresByReasonByType: {
        unknown: {
          '__index-threshold': 2,
          document__test__: 1,
          logs__alert__document__count: 1,
        },
      },
      countTotal: 4,
      countTotalFailures: 4,
      scheduledActionsPercentiles: {
        p50: 4,
        p90: 26,
        p99: 26,
      },
      scheduledActionsPercentilesByType: {
        p50: {
          '__index-threshold': 4,
          logs__alert__document__count: 10,
        },
        p90: {
          '__index-threshold': 26,
          logs__alert__document__count: 10,
        },
        p99: {
          '__index-threshold': 26,
          logs__alert__document__count: 10,
        },
      },
      alertsPercentiles: {
        p50: 10,
        p90: 22,
        p99: 22,
      },
      alertsPercentilesByType: {
        p50: {
          '__index-threshold': 10,
          logs__alert__document__count: 5,
        },
        p90: {
          '__index-threshold': 22,
          logs__alert__document__count: 13,
        },
        p99: {
          '__index-threshold': 22,
          logs__alert__document__count: 13,
        },
      },
    });
  });

  test('getExecutionTimeoutsPerDayCount should return execution aggregations for total timeout count and count by rule type', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockResponse(
      // @ts-expect-error @elastic/elasticsearch Aggregate only allows unknown values
      {
        aggregations: {
          byRuleTypeId: {
            value: {
              ruleTypes: {
                '.index-threshold': 2,
                'logs.alert.document.count': 1,
                'document.test.': 1,
              },
            },
          },
        },
        hits: {
          hits: [],
        },
      }
    );

    const telemetry = await getExecutionTimeoutsPerDayCount(mockEsClient, 'test');

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);

    expect(telemetry).toStrictEqual({
      countTotal: 4,
      countByType: {
        '__index-threshold': 2,
        document__test__: 1,
        logs__alert__document__count: 1,
      },
    });
  });

  test('getFailedAndUnrecognizedTasksPerDay should aggregations for total count, count by status and count by status and rule type for failed and unrecognized tasks', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockResponse(
      // @ts-expect-error @elastic/elasticsearch Aggregate only allows unknown values
      {
        aggregations: {
          byTaskTypeId: {
            value: {
              statuses: {
                failed: {
                  '.index-threshold': 2,
                  'logs.alert.document.count': 1,
                  'document.test.': 1,
                },
                unrecognized: {
                  'o.l.d.task-type': 1,
                },
              },
            },
          },
        },
        hits: {
          hits: [],
        },
      }
    );

    const telemetry = await getFailedAndUnrecognizedTasksPerDay(mockEsClient, 'test');

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);

    expect(telemetry).toStrictEqual({
      countByStatus: {
        failed: 4,
        unrecognized: 1,
      },
      countByStatusByRuleType: {
        failed: {
          '__index-threshold': 2,
          document__test__: 1,
          logs__alert__document__count: 1,
        },
        unrecognized: {
          'o__l__d__task-type': 1,
        },
      },
      countTotal: 5,
    });
  });

  test('parsePercentileAggsByRuleType', () => {
    const aggsByType = {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: '.index-threshold',
          doc_count: 149,
          percentileScheduledActions: {
            values: {
              '50.0': 4.0,
              '90.0': 26.0,
              '99.0': 26.0,
            },
          },
          percentileAlerts: {
            values: {
              '50.0': 3.0,
              '90.0': 22.0,
              '99.0': 22.0,
            },
          },
        },
        {
          key: 'logs.alert.document.count',
          doc_count: 1,
          percentileScheduledActions: {
            values: {
              '50.0': 10.0,
              '90.0': 10.0,
              '99.0': 10.0,
            },
          },
          percentileAlerts: {
            values: {
              '50.0': 5.0,
              '90.0': 16.0,
              '99.0': 16.0,
            },
          },
        },
        {
          key: 'document.test.',
          doc_count: 1,
          percentileScheduledActions: {
            values: {
              '50.0': null,
              '90.0': null,
              '99.0': null,
            },
          },
          percentileAlerts: {
            values: {
              '50.0': null,
              '90.0': null,
              '99.0': null,
            },
          },
        },
      ],
    };
    expect(
      parsePercentileAggsByRuleType(aggsByType.buckets, 'percentileScheduledActions.values')
    ).toEqual({
      p50: {
        '__index-threshold': 4,
        document__test__: 0,
        logs__alert__document__count: 10,
      },
      p90: {
        '__index-threshold': 26,
        document__test__: 0,
        logs__alert__document__count: 10,
      },
      p99: {
        '__index-threshold': 26,
        document__test__: 0,
        logs__alert__document__count: 10,
      },
    });
    expect(parsePercentileAggsByRuleType(aggsByType.buckets, 'percentileAlerts.values')).toEqual({
      p50: {
        '__index-threshold': 3,
        document__test__: 0,
        logs__alert__document__count: 5,
      },
      p90: {
        '__index-threshold': 22,
        document__test__: 0,
        logs__alert__document__count: 16,
      },
      p99: {
        '__index-threshold': 22,
        document__test__: 0,
        logs__alert__document__count: 16,
      },
    });
  });

  test('parsePercentileAggsByRuleType handles unknown path', () => {
    const aggsByType = {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: '.index-threshold',
          doc_count: 149,
          percentileScheduledActions: {
            values: {
              '50.0': 4.0,
              '90.0': 26.0,
              '99.0': 26.0,
            },
          },
        },
        {
          key: 'logs.alert.document.count',
          doc_count: 1,
          percentileScheduledActions: {
            values: {
              '50.0': 10.0,
              '90.0': 10.0,
              '99.0': 10.0,
            },
          },
        },
      ],
    };
    expect(parsePercentileAggsByRuleType(aggsByType.buckets, 'foo.values')).toEqual({
      p50: {},
      p90: {},
      p99: {},
    });
  });

  test('parsePercentileAggsByRuleType handles unrecognized percentiles', () => {
    const aggsByType = {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: '.index-threshold',
          doc_count: 149,
          percentileScheduledActions: {
            values: {
              '50.0': 4.0,
              '75.0': 8.0,
              '90.0': 26.0,
              '99.0': 26.0,
            },
          },
        },
        {
          key: 'logs.alert.document.count',
          doc_count: 1,
          percentileScheduledActions: {
            values: {
              '50.0': 10.0,
              '75.0': 10.0,
              '90.0': 10.0,
              '99.0': 10.0,
            },
          },
        },
      ],
    };
    expect(
      parsePercentileAggsByRuleType(aggsByType.buckets, 'percentileScheduledActions.values')
    ).toEqual({
      p50: {
        '__index-threshold': 4,
        logs__alert__document__count: 10,
      },
      p90: {
        '__index-threshold': 26,
        logs__alert__document__count: 10,
      },
      p99: {
        '__index-threshold': 26,
        logs__alert__document__count: 10,
      },
    });
  });
});
