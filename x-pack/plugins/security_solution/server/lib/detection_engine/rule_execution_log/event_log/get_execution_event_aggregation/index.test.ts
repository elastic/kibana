/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_EXECUTION_EVENTS_DISPLAYED } from '@kbn/securitysolution-rules';

import {
  formatExecutionEventResponse,
  formatSortForBucketSort,
  formatSortForTermsSort,
  getExecutionEventAggregation,
  getProviderAndActionFilter,
} from './index';

describe('getExecutionEventAggregation', () => {
  test('should throw error when given bad maxExecutions field', () => {
    expect(() => {
      getExecutionEventAggregation({
        maxExecutions: 1001,
        page: 1,
        perPage: 10,
        sort: [{ timestamp: { order: 'asc' } }],
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"Invalid maxExecutions requested \\"1001\\" - must be less than ${MAX_EXECUTION_EVENTS_DISPLAYED}"`
    );
  });

  test('should throw error when given bad page field', () => {
    expect(() => {
      getExecutionEventAggregation({
        maxExecutions: 5,
        page: 0,
        perPage: 10,
        sort: [{ timestamp: { order: 'asc' } }],
      });
    }).toThrowErrorMatchingInlineSnapshot(`"Invalid page field \\"0\\" - must be greater than 0"`);
  });

  test('should throw error when given bad perPage field', () => {
    expect(() => {
      getExecutionEventAggregation({
        maxExecutions: 5,
        page: 1,
        perPage: 0,
        sort: [{ timestamp: { order: 'asc' } }],
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"Invalid perPage field \\"0\\" - must be greater than 0"`
    );
  });

  test('should throw error when given bad sort field', () => {
    expect(() => {
      getExecutionEventAggregation({
        maxExecutions: 5,
        page: 1,
        perPage: 10,
        sort: [{ notsortable: { order: 'asc' } }],
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"Invalid sort field \\"notsortable\\" - must be one of [timestamp,duration_ms,indexing_duration_ms,search_duration_ms,gap_duration_ms,schedule_delay_ms,num_triggered_actions]"`
    );
  });

  test('should throw error when given one bad sort field', () => {
    expect(() => {
      getExecutionEventAggregation({
        maxExecutions: 5,
        page: 1,
        perPage: 10,
        sort: [{ notsortable: { order: 'asc' } }, { timestamp: { order: 'asc' } }],
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"Invalid sort field \\"notsortable\\" - must be one of [timestamp,duration_ms,indexing_duration_ms,search_duration_ms,gap_duration_ms,schedule_delay_ms,num_triggered_actions]"`
    );
  });

  test('should correctly generate aggregation', () => {
    expect(
      getExecutionEventAggregation({
        maxExecutions: 5,
        page: 2,
        perPage: 10,
        sort: [{ timestamp: { order: 'asc' } }, { duration_ms: { order: 'desc' } }],
      })
    ).toEqual({
      totalExecutions: {
        cardinality: {
          field: 'kibana.alert.rule.execution.uuid',
        },
      },
      executionUuid: {
        terms: {
          field: 'kibana.alert.rule.execution.uuid',
          size: 5,
          order: [
            {
              'ruleExecution>executeStartTime': 'asc',
            },
            {
              'ruleExecution>executionDuration': 'desc',
            },
          ],
        },
        aggs: {
          executionUuidSorted: {
            bucket_sort: {
              sort: [
                {
                  'ruleExecution>executeStartTime': {
                    order: 'asc',
                  },
                },
                {
                  'ruleExecution>executionDuration': {
                    order: 'desc',
                  },
                },
              ],
              from: 10,
              size: 10,
              gap_policy: 'insert_zeros',
            },
          },
          actionExecution: {
            filter: {
              bool: {
                must: [
                  {
                    match: {
                      'event.action': 'execute',
                    },
                  },
                  {
                    match: {
                      'event.provider': 'actions',
                    },
                  },
                ],
              },
            },
            aggs: {
              actionOutcomes: {
                terms: {
                  field: 'event.outcome',
                  size: 2,
                },
              },
            },
          },
          ruleExecution: {
            filter: {
              bool: {
                must: [
                  {
                    match: {
                      'event.action': 'execute',
                    },
                  },
                  {
                    match: {
                      'event.provider': 'alerting',
                    },
                  },
                ],
              },
            },
            aggs: {
              executeStartTime: {
                min: {
                  field: 'event.start',
                },
              },
              scheduleDelay: {
                max: {
                  field: 'kibana.task.schedule_delay',
                },
              },
              esSearchDuration: {
                max: {
                  field: 'kibana.alert.rule.execution.metrics.es_search_duration_ms',
                },
              },
              numTriggeredActions: {
                max: {
                  field: 'kibana.alert.rule.execution.metrics.number_of_triggered_actions',
                },
              },
              executionDuration: {
                max: {
                  field: 'event.duration',
                },
              },
              outcomeAndMessage: {
                top_hits: {
                  size: 1,
                  _source: {
                    includes: ['event.outcome', 'message'],
                  },
                },
              },
            },
          },
          securityMetrics: {
            filter: {
              bool: {
                must: [
                  {
                    match: {
                      'event.action': 'execution-metrics',
                    },
                  },
                  {
                    match: {
                      'event.provider': 'securitySolution.ruleExecution',
                    },
                  },
                ],
              },
            },
            aggs: {
              gapDuration: {
                min: {
                  field: 'kibana.alert.rule.execution.metrics.execution_gap_duration_s',
                  missing: 0,
                },
              },
              indexDuration: {
                min: {
                  field: 'kibana.alert.rule.execution.metrics.total_indexing_duration_ms',
                },
              },
              searchDuration: {
                min: {
                  field: 'kibana.alert.rule.execution.metrics.total_search_duration_ms',
                },
              },
            },
          },
          securityStatus: {
            filter: {
              bool: {
                must: [
                  {
                    match: {
                      'event.action': 'status-change',
                    },
                  },
                  {
                    match: {
                      'event.provider': 'securitySolution.ruleExecution',
                    },
                  },
                ],
              },
            },
            aggs: {
              status: {
                top_hits: {
                  sort: {
                    '@timestamp': {
                      order: 'desc',
                    },
                  },
                  size: 1,
                  _source: {
                    includes: 'kibana.alert.rule.execution.status',
                  },
                },
              },
              message: {
                top_hits: {
                  size: 1,
                  sort: {
                    '@timestamp': {
                      order: 'desc',
                    },
                  },
                  _source: {
                    includes: 'message',
                  },
                },
              },
            },
          },
          timeoutMessage: {
            filter: {
              bool: {
                must: [
                  {
                    match: {
                      'event.action': 'execute-timeout',
                    },
                  },
                  {
                    match: {
                      'event.provider': 'alerting',
                    },
                  },
                ],
              },
            },
          },
        },
      },
    });
  });
});

describe('getProviderAndActionFilter', () => {
  test('should correctly format array of sort combinations for bucket sorting', () => {
    expect(getProviderAndActionFilter('securitySolution.ruleExecution', 'status-change')).toEqual({
      bool: {
        must: [
          { match: { 'event.action': 'status-change' } },
          { match: { 'event.provider': 'securitySolution.ruleExecution' } },
        ],
      },
    });
  });
});

describe('formatSortForBucketSort', () => {
  test('should correctly format array of sort combinations for bucket sorting', () => {
    expect(
      formatSortForBucketSort([{ timestamp: { order: 'desc' } }, { duration_ms: { order: 'asc' } }])
    ).toEqual([
      { 'ruleExecution>executeStartTime': { order: 'desc' } },
      { 'ruleExecution>executionDuration': { order: 'asc' } },
    ]);
  });
});

describe('formatSortForTermsSort', () => {
  test('should correctly format array of sort combinations for bucket sorting', () => {
    expect(
      formatSortForTermsSort([{ timestamp: { order: 'desc' } }, { duration_ms: { order: 'asc' } }])
    ).toEqual([
      { 'ruleExecution>executeStartTime': 'desc' },
      { 'ruleExecution>executionDuration': 'asc' },
    ]);
  });
});

describe('formatExecutionEventResponse', () => {
  test('should return empty results if aggregations are undefined', () => {
    expect(formatExecutionEventResponse({ aggregations: undefined })).toEqual({
      total: 0,
      events: [],
    });
  });
  test('should format results correctly', () => {
    const results = {
      aggregations: {
        executionUuid: {
          meta: {},
          doc_count_error_upper_bound: -1,
          sum_other_doc_count: 1184,
          buckets: [
            {
              key: '01e458c9-d01a-4359-94f9-1ed256c6488e',
              doc_count: 6,
              timeoutMessage: {
                meta: {},
                doc_count: 0,
              },
              securityMetrics: {
                meta: {},
                doc_count: 1,
                searchDuration: {
                  value: 480.0,
                },
                indexDuration: {
                  value: 7.0,
                },
                gapDuration: {
                  value: 0.0,
                },
              },
              ruleExecution: {
                meta: {},
                doc_count: 1,
                numTriggeredActions: {
                  value: 0.0,
                },
                scheduleDelay: {
                  value: 3.147e9,
                },
                outcomeAndMessage: {
                  hits: {
                    total: {
                      value: 1,
                      relation: 'eq',
                    },
                    max_score: 1.0,
                    hits: [
                      {
                        _index: '.kibana-event-log-8.2.0-000001',
                        _id: 'Ca-qiX8Brb7RSEAgSLXB',
                        _score: 1.0,
                        _source: {
                          event: {
                            outcome: 'success',
                          },
                          message:
                            "rule executed: siem.queryRule:f78f3550-a186-11ec-89a1-0bce95157aba: 'This Rule Makes Alerts, Actions, AND Moar!'",
                        },
                      },
                    ],
                  },
                },
                esSearchDuration: {
                  value: 464.0,
                },
                executionDuration: {
                  value: 1.775e9,
                },
                executeStartTime: {
                  value: 1.647282110867e12,
                  value_as_string: '2022-03-14T18:21:50.867Z',
                },
              },
              actionExecution: {
                meta: {},
                doc_count: 0,
                actionOutcomes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [],
                },
              },
              securityStatus: {
                meta: {},
                doc_count: 2,
                message: {
                  hits: {
                    total: {
                      value: 2,
                      relation: 'eq',
                    },
                    max_score: null,
                    hits: [
                      {
                        _index: '.kibana-event-log-8.2.0-000001',
                        _id: 'B6-qiX8Brb7RSEAgSLXB',
                        _score: null,
                        _source: {
                          message: 'succeeded',
                        },
                        sort: [1647282112198],
                      },
                    ],
                  },
                },
                status: {
                  hits: {
                    total: {
                      value: 2,
                      relation: 'eq',
                    },
                    max_score: null,
                    hits: [
                      {
                        _index: '.kibana-event-log-8.2.0-000001',
                        _id: 'B6-qiX8Brb7RSEAgSLXB',
                        _score: null,
                        _source: {
                          kibana: {
                            alert: {
                              rule: {
                                execution: {
                                  status: 'succeeded',
                                },
                              },
                            },
                          },
                        },
                        sort: [1647282112198],
                      },
                    ],
                  },
                },
              },
            },
            {
              key: '02b7c7a4-ae1a-4da5-b134-c2fb96eb0e04',
              doc_count: 5,
              timeoutMessage: {
                meta: {},
                doc_count: 0,
              },
              securityMetrics: {
                meta: {},
                doc_count: 1,
                searchDuration: {
                  value: 9.0,
                },
                indexDuration: {
                  value: 0.0,
                },
                gapDuration: {
                  value: 0.0,
                },
              },
              ruleExecution: {
                meta: {},
                doc_count: 1,
                numTriggeredActions: {
                  value: 0.0,
                },
                scheduleDelay: {
                  value: 9.96e8,
                },
                outcomeAndMessage: {
                  hits: {
                    total: {
                      value: 1,
                      relation: 'eq',
                    },
                    max_score: 1.0,
                    hits: [
                      {
                        _index: '.kibana-event-log-8.2.0-000001',
                        _id: 'pK84iX8Brb7RSEAg3a-L',
                        _score: 1.0,
                        _source: {
                          event: {
                            outcome: 'success',
                          },
                          message:
                            "rule executed: siem.queryRule:7457b121-a3a8-11ec-a0f0-cbd1c2ae6ee8: 'Endpoint Security'",
                        },
                      },
                    ],
                  },
                },
                esSearchDuration: {
                  value: 5.0,
                },
                executionDuration: {
                  value: 1.922e9,
                },
                executeStartTime: {
                  value: 1.647274677664e12,
                  value_as_string: '2022-03-14T16:17:57.664Z',
                },
              },
              actionExecution: {
                meta: {},
                doc_count: 0,
                actionOutcomes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [],
                },
              },
              securityStatus: {
                meta: {},
                doc_count: 2,
                message: {
                  hits: {
                    total: {
                      value: 2,
                      relation: 'eq',
                    },
                    max_score: null,
                    hits: [
                      {
                        _index: '.kibana-event-log-8.2.0-000001',
                        _id: 'o684iX8Brb7RSEAg2a-j',
                        _score: null,
                        _source: {
                          message: 'succeeded',
                        },
                        sort: [1647274678629],
                      },
                    ],
                  },
                },
                status: {
                  hits: {
                    total: {
                      value: 2,
                      relation: 'eq',
                    },
                    max_score: null,
                    hits: [
                      {
                        _index: '.kibana-event-log-8.2.0-000001',
                        _id: 'o684iX8Brb7RSEAg2a-j',
                        _score: null,
                        _source: {
                          kibana: {
                            alert: {
                              rule: {
                                execution: {
                                  status: 'succeeded',
                                },
                              },
                            },
                          },
                        },
                        sort: [1647274678629],
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
        totalExecutions: {
          value: 768,
        },
      },
    };
    expect(formatExecutionEventResponse(results)).toEqual({
      total: 768,
      events: [
        {
          execution_uuid: '01e458c9-d01a-4359-94f9-1ed256c6488e',
          timestamp: '2022-03-14T18:21:50.867Z',
          duration_ms: 1775,
          status: 'success',
          message:
            "rule executed: siem.queryRule:f78f3550-a186-11ec-89a1-0bce95157aba: 'This Rule Makes Alerts, Actions, AND Moar!'",
          num_active_alerts: 0,
          num_new_alerts: 0,
          num_recovered_alerts: 0,
          num_triggered_actions: 0,
          num_succeeded_actions: 0,
          num_errored_actions: 0,
          total_search_duration_ms: 0,
          es_search_duration_ms: 464,
          schedule_delay_ms: 3147,
          timed_out: false,
          indexing_duration_ms: 7,
          search_duration_ms: 480,
          gap_duration_ms: 0,
          security_status: 'succeeded',
          security_message: 'succeeded',
        },
        {
          execution_uuid: '02b7c7a4-ae1a-4da5-b134-c2fb96eb0e04',
          timestamp: '2022-03-14T16:17:57.664Z',
          duration_ms: 1922,
          status: 'success',
          message:
            "rule executed: siem.queryRule:7457b121-a3a8-11ec-a0f0-cbd1c2ae6ee8: 'Endpoint Security'",
          num_active_alerts: 0,
          num_new_alerts: 0,
          num_recovered_alerts: 0,
          num_triggered_actions: 0,
          num_succeeded_actions: 0,
          num_errored_actions: 0,
          total_search_duration_ms: 0,
          es_search_duration_ms: 5,
          schedule_delay_ms: 996,
          timed_out: false,
          indexing_duration_ms: 0,
          search_duration_ms: 9,
          gap_duration_ms: 0,
          security_status: 'succeeded',
          security_message: 'succeeded',
        },
      ],
    });
  });

  test('should format results correctly when execution timeouts occur', () => {
    const results = {
      aggregations: {
        executionUuid: {
          meta: {},
          doc_count_error_upper_bound: -1,
          sum_other_doc_count: 1184,
          buckets: [
            {
              key: '01e458c9-d01a-4359-94f9-1ed256c6488e',
              doc_count: 6,
              timeoutMessage: {
                meta: {},
                doc_count: 1,
              },
              securityMetrics: {
                meta: {},
                doc_count: 1,
                searchDuration: {
                  value: 480.0,
                },
                indexDuration: {
                  value: 7.0,
                },
                gapDuration: {
                  value: 0.0,
                },
              },
              ruleExecution: {
                meta: {},
                doc_count: 1,
                numTriggeredActions: {
                  value: 0.0,
                },
                scheduleDelay: {
                  value: 3.147e9,
                },
                outcomeAndMessage: {
                  hits: {
                    total: {
                      value: 1,
                      relation: 'eq',
                    },
                    max_score: 1.0,
                    hits: [
                      {
                        _index: '.kibana-event-log-8.2.0-000001',
                        _id: 'Ca-qiX8Brb7RSEAgSLXB',
                        _score: 1.0,
                        _source: {
                          event: {
                            outcome: 'success',
                          },
                          message:
                            "rule executed: siem.queryRule:f78f3550-a186-11ec-89a1-0bce95157aba: 'This Rule Makes Alerts, Actions, AND Moar!'",
                        },
                      },
                    ],
                  },
                },
                esSearchDuration: {
                  value: 464.0,
                },
                executionDuration: {
                  value: 1.775e9,
                },
                executeStartTime: {
                  value: 1.647282110867e12,
                  value_as_string: '2022-03-14T18:21:50.867Z',
                },
              },
              actionExecution: {
                meta: {},
                doc_count: 0,
                actionOutcomes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [],
                },
              },
              securityStatus: {
                meta: {},
                doc_count: 2,
                message: {
                  hits: {
                    total: {
                      value: 2,
                      relation: 'eq',
                    },
                    max_score: null,
                    hits: [
                      {
                        _index: '.kibana-event-log-8.2.0-000001',
                        _id: 'B6-qiX8Brb7RSEAgSLXB',
                        _score: null,
                        _source: {
                          message: 'succeeded',
                        },
                        sort: [1647282112198],
                      },
                    ],
                  },
                },
                status: {
                  hits: {
                    total: {
                      value: 2,
                      relation: 'eq',
                    },
                    max_score: null,
                    hits: [
                      {
                        _index: '.kibana-event-log-8.2.0-000001',
                        _id: 'B6-qiX8Brb7RSEAgSLXB',
                        _score: null,
                        _source: {
                          kibana: {
                            alert: {
                              rule: {
                                execution: {
                                  status: 'succeeded',
                                },
                              },
                            },
                          },
                        },
                        sort: [1647282112198],
                      },
                    ],
                  },
                },
              },
            },
            {
              key: '02b7c7a4-ae1a-4da5-b134-c2fb96eb0e04',
              doc_count: 5,
              timeoutMessage: {
                meta: {},
                doc_count: 0,
              },
              securityMetrics: {
                meta: {},
                doc_count: 1,
                searchDuration: {
                  value: 9.0,
                },
                indexDuration: {
                  value: 0.0,
                },
                gapDuration: {
                  value: 0.0,
                },
              },
              ruleExecution: {
                meta: {},
                doc_count: 1,
                numTriggeredActions: {
                  value: 0.0,
                },
                scheduleDelay: {
                  value: 9.96e8,
                },
                outcomeAndMessage: {
                  hits: {
                    total: {
                      value: 1,
                      relation: 'eq',
                    },
                    max_score: 1.0,
                    hits: [
                      {
                        _index: '.kibana-event-log-8.2.0-000001',
                        _id: 'pK84iX8Brb7RSEAg3a-L',
                        _score: 1.0,
                        _source: {
                          event: {
                            outcome: 'success',
                          },
                          message:
                            "rule executed: siem.queryRule:7457b121-a3a8-11ec-a0f0-cbd1c2ae6ee8: 'Endpoint Security'",
                        },
                      },
                    ],
                  },
                },
                esSearchDuration: {
                  value: 5.0,
                },
                executionDuration: {
                  value: 1.922e9,
                },
                executeStartTime: {
                  value: 1.647274677664e12,
                  value_as_string: '2022-03-14T16:17:57.664Z',
                },
              },
              actionExecution: {
                meta: {},
                doc_count: 0,
                actionOutcomes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [],
                },
              },
              securityStatus: {
                meta: {},
                doc_count: 2,
                message: {
                  hits: {
                    total: {
                      value: 2,
                      relation: 'eq',
                    },
                    max_score: null,
                    hits: [
                      {
                        _index: '.kibana-event-log-8.2.0-000001',
                        _id: 'o684iX8Brb7RSEAg2a-j',
                        _score: null,
                        _source: {
                          message: 'succeeded',
                        },
                        sort: [1647274678629],
                      },
                    ],
                  },
                },
                status: {
                  hits: {
                    total: {
                      value: 2,
                      relation: 'eq',
                    },
                    max_score: null,
                    hits: [
                      {
                        _index: '.kibana-event-log-8.2.0-000001',
                        _id: 'o684iX8Brb7RSEAg2a-j',
                        _score: null,
                        _source: {
                          kibana: {
                            alert: {
                              rule: {
                                execution: {
                                  status: 'succeeded',
                                },
                              },
                            },
                          },
                        },
                        sort: [1647274678629],
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
        totalExecutions: {
          value: 768,
        },
      },
    };
    expect(formatExecutionEventResponse(results)).toEqual({
      total: 768,
      events: [
        {
          execution_uuid: '01e458c9-d01a-4359-94f9-1ed256c6488e',
          timestamp: '2022-03-14T18:21:50.867Z',
          duration_ms: 1775,
          status: 'success',
          message:
            "rule executed: siem.queryRule:f78f3550-a186-11ec-89a1-0bce95157aba: 'This Rule Makes Alerts, Actions, AND Moar!'",
          num_active_alerts: 0,
          num_new_alerts: 0,
          num_recovered_alerts: 0,
          num_triggered_actions: 0,
          num_succeeded_actions: 0,
          num_errored_actions: 0,
          total_search_duration_ms: 0,
          es_search_duration_ms: 464,
          schedule_delay_ms: 3147,
          timed_out: true,
          indexing_duration_ms: 7,
          search_duration_ms: 480,
          gap_duration_ms: 0,
          security_status: 'succeeded',
          security_message: 'succeeded',
        },
        {
          execution_uuid: '02b7c7a4-ae1a-4da5-b134-c2fb96eb0e04',
          timestamp: '2022-03-14T16:17:57.664Z',
          duration_ms: 1922,
          status: 'success',
          message:
            "rule executed: siem.queryRule:7457b121-a3a8-11ec-a0f0-cbd1c2ae6ee8: 'Endpoint Security'",
          num_active_alerts: 0,
          num_new_alerts: 0,
          num_recovered_alerts: 0,
          num_triggered_actions: 0,
          num_succeeded_actions: 0,
          num_errored_actions: 0,
          total_search_duration_ms: 0,
          es_search_duration_ms: 5,
          schedule_delay_ms: 996,
          timed_out: false,
          indexing_duration_ms: 0,
          search_duration_ms: 9,
          gap_duration_ms: 0,
          security_status: 'succeeded',
          security_message: 'succeeded',
        },
      ],
    });
  });

  test('should format results correctly when action errors occur', () => {
    const results = {
      aggregations: {
        executionUuid: {
          meta: {},
          doc_count_error_upper_bound: -1,
          sum_other_doc_count: 1184,
          buckets: [
            {
              key: '01e458c9-d01a-4359-94f9-1ed256c6488e',
              doc_count: 6,
              timeoutMessage: {
                meta: {},
                doc_count: 1,
              },
              securityMetrics: {
                meta: {},
                doc_count: 1,
                searchDuration: {
                  value: 480.0,
                },
                indexDuration: {
                  value: 7.0,
                },
                gapDuration: {
                  value: 0.0,
                },
              },
              ruleExecution: {
                meta: {},
                doc_count: 1,
                numTriggeredActions: {
                  value: 0.0,
                },
                scheduleDelay: {
                  value: 3.147e9,
                },
                outcomeAndMessage: {
                  hits: {
                    total: {
                      value: 1,
                      relation: 'eq',
                    },
                    max_score: 1.0,
                    hits: [
                      {
                        _index: '.kibana-event-log-8.2.0-000001',
                        _id: 'Ca-qiX8Brb7RSEAgSLXB',
                        _score: 1.0,
                        _source: {
                          event: {
                            outcome: 'success',
                          },
                          message:
                            "rule executed: siem.queryRule:f78f3550-a186-11ec-89a1-0bce95157aba: 'This Rule Makes Alerts, Actions, AND Moar!'",
                        },
                      },
                    ],
                  },
                },
                esSearchDuration: {
                  value: 464.0,
                },
                executionDuration: {
                  value: 1.775e9,
                },
                executeStartTime: {
                  value: 1.647282110867e12,
                  value_as_string: '2022-03-14T18:21:50.867Z',
                },
              },
              actionExecution: {
                meta: {},
                doc_count: 5,
                actionOutcomes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'success',
                      doc_count: 5,
                    },
                  ],
                },
              },
              securityStatus: {
                meta: {},
                doc_count: 2,
                message: {
                  hits: {
                    total: {
                      value: 2,
                      relation: 'eq',
                    },
                    max_score: null,
                    hits: [
                      {
                        _index: '.kibana-event-log-8.2.0-000001',
                        _id: 'B6-qiX8Brb7RSEAgSLXB',
                        _score: null,
                        _source: {
                          message: 'succeeded',
                        },
                        sort: [1647282112198],
                      },
                    ],
                  },
                },
                status: {
                  hits: {
                    total: {
                      value: 2,
                      relation: 'eq',
                    },
                    max_score: null,
                    hits: [
                      {
                        _index: '.kibana-event-log-8.2.0-000001',
                        _id: 'B6-qiX8Brb7RSEAgSLXB',
                        _score: null,
                        _source: {
                          kibana: {
                            alert: {
                              rule: {
                                execution: {
                                  status: 'succeeded',
                                },
                              },
                            },
                          },
                        },
                        sort: [1647282112198],
                      },
                    ],
                  },
                },
              },
            },
            {
              key: '02b7c7a4-ae1a-4da5-b134-c2fb96eb0e04',
              doc_count: 5,
              timeoutMessage: {
                meta: {},
                doc_count: 0,
              },
              securityMetrics: {
                meta: {},
                doc_count: 1,
                searchDuration: {
                  value: 9.0,
                },
                indexDuration: {
                  value: 0.0,
                },
                gapDuration: {
                  value: 0.0,
                },
              },
              ruleExecution: {
                meta: {},
                doc_count: 1,
                numTriggeredActions: {
                  value: 0.0,
                },
                scheduleDelay: {
                  value: 9.96e8,
                },
                outcomeAndMessage: {
                  hits: {
                    total: {
                      value: 1,
                      relation: 'eq',
                    },
                    max_score: 1.0,
                    hits: [
                      {
                        _index: '.kibana-event-log-8.2.0-000001',
                        _id: 'pK84iX8Brb7RSEAg3a-L',
                        _score: 1.0,
                        _source: {
                          event: {
                            outcome: 'success',
                          },
                          message:
                            "rule executed: siem.queryRule:7457b121-a3a8-11ec-a0f0-cbd1c2ae6ee8: 'Endpoint Security'",
                        },
                      },
                    ],
                  },
                },
                esSearchDuration: {
                  value: 5.0,
                },
                executionDuration: {
                  value: 1.922e9,
                },
                executeStartTime: {
                  value: 1.647274677664e12,
                  value_as_string: '2022-03-14T16:17:57.664Z',
                },
              },
              actionExecution: {
                meta: {},
                doc_count: 0,
                actionOutcomes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [],
                },
              },
              securityStatus: {
                meta: {},
                doc_count: 2,
                message: {
                  hits: {
                    total: {
                      value: 2,
                      relation: 'eq',
                    },
                    max_score: null,
                    hits: [
                      {
                        _index: '.kibana-event-log-8.2.0-000001',
                        _id: 'o684iX8Brb7RSEAg2a-j',
                        _score: null,
                        _source: {
                          message: 'succeeded',
                        },
                        sort: [1647274678629],
                      },
                    ],
                  },
                },
                status: {
                  hits: {
                    total: {
                      value: 2,
                      relation: 'eq',
                    },
                    max_score: null,
                    hits: [
                      {
                        _index: '.kibana-event-log-8.2.0-000001',
                        _id: 'o684iX8Brb7RSEAg2a-j',
                        _score: null,
                        _source: {
                          kibana: {
                            alert: {
                              rule: {
                                execution: {
                                  status: 'succeeded',
                                },
                              },
                            },
                          },
                        },
                        sort: [1647274678629],
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
        totalExecutions: {
          value: 768,
        },
      },
    };
    expect(formatExecutionEventResponse(results)).toEqual({
      total: 768,
      events: [
        {
          execution_uuid: '01e458c9-d01a-4359-94f9-1ed256c6488e',
          timestamp: '2022-03-14T18:21:50.867Z',
          duration_ms: 1775,
          status: 'success',
          message:
            "rule executed: siem.queryRule:f78f3550-a186-11ec-89a1-0bce95157aba: 'This Rule Makes Alerts, Actions, AND Moar!'",
          num_active_alerts: 0,
          num_new_alerts: 0,
          num_recovered_alerts: 0,
          num_triggered_actions: 0,
          num_succeeded_actions: 5,
          num_errored_actions: 0,
          total_search_duration_ms: 0,
          es_search_duration_ms: 464,
          schedule_delay_ms: 3147,
          timed_out: true,
          indexing_duration_ms: 7,
          search_duration_ms: 480,
          gap_duration_ms: 0,
          security_status: 'succeeded',
          security_message: 'succeeded',
        },
        {
          execution_uuid: '02b7c7a4-ae1a-4da5-b134-c2fb96eb0e04',
          timestamp: '2022-03-14T16:17:57.664Z',
          duration_ms: 1922,
          status: 'success',
          message:
            "rule executed: siem.queryRule:7457b121-a3a8-11ec-a0f0-cbd1c2ae6ee8: 'Endpoint Security'",
          num_active_alerts: 0,
          num_new_alerts: 0,
          num_recovered_alerts: 0,
          num_triggered_actions: 0,
          num_succeeded_actions: 0,
          num_errored_actions: 0,
          total_search_duration_ms: 0,
          es_search_duration_ms: 5,
          schedule_delay_ms: 996,
          timed_out: false,
          indexing_duration_ms: 0,
          search_duration_ms: 9,
          gap_duration_ms: 0,
          security_status: 'succeeded',
          security_message: 'succeeded',
        },
      ],
    });
  });
});
