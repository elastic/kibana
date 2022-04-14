/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getNumExecutions,
  getExecutionLogAggregation,
  formatExecutionLogResult,
  formatSortForBucketSort,
  formatSortForTermSort,
  ExecutionUuidAggResult,
} from './get_execution_log_aggregation';

describe('formatSortForBucketSort', () => {
  test('should correctly format array of sort combinations for bucket sorting', () => {
    expect(
      formatSortForBucketSort([
        { timestamp: { order: 'desc' } },
        { execution_duration: { order: 'asc' } },
      ])
    ).toEqual([
      { 'ruleExecution>executeStartTime': { order: 'desc' } },
      { 'ruleExecution>executionDuration': { order: 'asc' } },
    ]);
  });
});

describe('formatSortForTermSort', () => {
  test('should correctly format array of sort combinations for bucket sorting', () => {
    expect(
      formatSortForTermSort([
        { timestamp: { order: 'desc' } },
        { execution_duration: { order: 'asc' } },
      ])
    ).toEqual([
      { 'ruleExecution>executeStartTime': 'desc' },
      { 'ruleExecution>executionDuration': 'asc' },
    ]);
  });
});

describe('getNumExecutions', () => {
  test('should calculate the expected number of executions in a given date range with a given schedule interval', () => {
    expect(
      getNumExecutions(
        new Date('2020-12-01T00:00:00.000Z'),
        new Date('2020-12-02T00:00:00.000Z'),
        '1h'
      )
    ).toEqual(24);
  });

  test('should return 0 if dateEnd is less that dateStart', () => {
    expect(
      getNumExecutions(
        new Date('2020-12-02T00:00:00.000Z'),
        new Date('2020-12-01T00:00:00.000Z'),
        '1h'
      )
    ).toEqual(0);
  });

  test('should cap numExecutions at default max buckets limit', () => {
    expect(
      getNumExecutions(
        new Date('2020-12-01T00:00:00.000Z'),
        new Date('2020-12-02T00:00:00.000Z'),
        '1s'
      )
    ).toEqual(1000);
  });
});

describe('getExecutionLogAggregation', () => {
  test('should throw error when given bad sort field', () => {
    expect(() => {
      getExecutionLogAggregation({
        page: 1,
        perPage: 10,
        sort: [{ notsortable: { order: 'asc' } }],
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"Invalid sort field \\"notsortable\\" - must be one of [timestamp,execution_duration,total_search_duration,es_search_duration,schedule_delay,num_triggered_actions,num_scheduled_actions]"`
    );
  });

  test('should throw error when given one bad sort field', () => {
    expect(() => {
      getExecutionLogAggregation({
        page: 1,
        perPage: 10,
        sort: [{ notsortable: { order: 'asc' } }, { timestamp: { order: 'asc' } }],
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"Invalid sort field \\"notsortable\\" - must be one of [timestamp,execution_duration,total_search_duration,es_search_duration,schedule_delay,num_triggered_actions,num_scheduled_actions]"`
    );
  });

  test('should throw error when given bad page field', () => {
    expect(() => {
      getExecutionLogAggregation({
        page: 0,
        perPage: 10,
        sort: [{ timestamp: { order: 'asc' } }],
      });
    }).toThrowErrorMatchingInlineSnapshot(`"Invalid page field \\"0\\" - must be greater than 0"`);
  });

  test('should throw error when given bad perPage field', () => {
    expect(() => {
      getExecutionLogAggregation({
        page: 1,
        perPage: 0,
        sort: [{ timestamp: { order: 'asc' } }],
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"Invalid perPage field \\"0\\" - must be greater than 0"`
    );
  });

  test('should correctly generate aggregation', () => {
    expect(
      getExecutionLogAggregation({
        page: 2,
        perPage: 10,
        sort: [{ timestamp: { order: 'asc' } }, { execution_duration: { order: 'desc' } }],
      })
    ).toEqual({
      excludeExecuteStart: {
        filter: {
          bool: {
            must_not: [
              {
                term: {
                  'event.action': 'execute-start',
                },
              },
            ],
          },
        },
        aggs: {
          executionUuidCardinality: { cardinality: { field: 'kibana.alert.rule.execution.uuid' } },
          executionUuid: {
            terms: {
              field: 'kibana.alert.rule.execution.uuid',
              size: 1000,
              order: [
                { 'ruleExecution>executeStartTime': 'asc' },
                { 'ruleExecution>executionDuration': 'desc' },
              ],
            },
            aggs: {
              executionUuidSorted: {
                bucket_sort: {
                  sort: [
                    { 'ruleExecution>executeStartTime': { order: 'asc' } },
                    { 'ruleExecution>executionDuration': { order: 'desc' } },
                  ],
                  from: 10,
                  size: 10,
                  gap_policy: 'insert_zeros',
                },
              },
              alertCounts: {
                filters: {
                  filters: {
                    newAlerts: { match: { 'event.action': 'new-instance' } },
                    activeAlerts: { match: { 'event.action': 'active-instance' } },
                    recoveredAlerts: { match: { 'event.action': 'recovered-instance' } },
                  },
                },
              },
              actionExecution: {
                filter: {
                  bool: {
                    must: [
                      { match: { 'event.action': 'execute' } },
                      { match: { 'event.provider': 'actions' } },
                    ],
                  },
                },
                aggs: { actionOutcomes: { terms: { field: 'event.outcome', size: 2 } } },
              },
              ruleExecution: {
                filter: {
                  bool: {
                    must: [
                      { match: { 'event.action': 'execute' } },
                      { match: { 'event.provider': 'alerting' } },
                    ],
                  },
                },
                aggs: {
                  executeStartTime: { min: { field: 'event.start' } },
                  scheduleDelay: {
                    max: {
                      field: 'kibana.task.schedule_delay',
                    },
                  },
                  totalSearchDuration: {
                    max: { field: 'kibana.alert.rule.execution.metrics.total_search_duration_ms' },
                  },
                  esSearchDuration: {
                    max: { field: 'kibana.alert.rule.execution.metrics.es_search_duration_ms' },
                  },
                  numTriggeredActions: {
                    max: {
                      field: 'kibana.alert.rule.execution.metrics.number_of_triggered_actions',
                    },
                  },
                  numScheduledActions: {
                    max: {
                      field: 'kibana.alert.rule.execution.metrics.number_of_generated_actions',
                    },
                  },
                  executionDuration: { max: { field: 'event.duration' } },
                  outcomeAndMessage: {
                    top_hits: {
                      size: 1,
                      _source: { includes: ['event.outcome', 'message', 'error.message'] },
                    },
                  },
                },
              },
              timeoutMessage: {
                filter: {
                  bool: {
                    must: [
                      { match: { 'event.action': 'execute-timeout' } },
                      { match: { 'event.provider': 'alerting' } },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    });
  });
});

describe('formatExecutionLogResult', () => {
  test('should return empty results if aggregations are undefined', () => {
    expect(formatExecutionLogResult({ aggregations: undefined })).toEqual({
      total: 0,
      data: [],
    });
  });
  test('should return empty results if aggregations.excludeExecuteStart are undefined', () => {
    expect(
      formatExecutionLogResult({
        aggregations: { excludeExecuteStart: undefined as unknown as ExecutionUuidAggResult },
      })
    ).toEqual({
      total: 0,
      data: [],
    });
  });
  test('should format results correctly', () => {
    const results = {
      aggregations: {
        excludeExecuteStart: {
          meta: {},
          doc_count: 875,
          executionUuid: {
            meta: {},
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: '6705da7d-2635-499d-a6a8-1aee1ae1eac9',
                doc_count: 27,
                timeoutMessage: {
                  meta: {},
                  doc_count: 0,
                },
                alertCounts: {
                  meta: {},
                  buckets: {
                    activeAlerts: {
                      doc_count: 5,
                    },
                    newAlerts: {
                      doc_count: 5,
                    },
                    recoveredAlerts: {
                      doc_count: 0,
                    },
                  },
                },
                ruleExecution: {
                  meta: {},
                  doc_count: 1,
                  numTriggeredActions: {
                    value: 5.0,
                  },
                  numScheduledActions: {
                    value: 5.0,
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
                          _id: 'S4wIZX8B8TGQpG7XQZns',
                          _score: 1.0,
                          _source: {
                            event: {
                              outcome: 'success',
                            },
                            message:
                              "rule executed: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule'",
                          },
                        },
                      ],
                    },
                  },
                  scheduleDelay: {
                    value: 3.074e9,
                  },
                  totalSearchDuration: {
                    value: 0.0,
                  },
                  esSearchDuration: {
                    value: 0.0,
                  },
                  executionDuration: {
                    value: 1.056e9,
                  },
                  executeStartTime: {
                    value: 1.646667512617e12,
                    value_as_string: '2022-03-07T15:38:32.617Z',
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
              },
              {
                key: '41b2755e-765a-4044-9745-b03875d5e79a',
                doc_count: 32,
                timeoutMessage: {
                  meta: {},
                  doc_count: 0,
                },
                alertCounts: {
                  meta: {},
                  buckets: {
                    activeAlerts: {
                      doc_count: 5,
                    },
                    newAlerts: {
                      doc_count: 5,
                    },
                    recoveredAlerts: {
                      doc_count: 5,
                    },
                  },
                },
                ruleExecution: {
                  meta: {},
                  doc_count: 1,
                  numTriggeredActions: {
                    value: 5.0,
                  },
                  numScheduledActions: {
                    value: 5.0,
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
                          _id: 'a4wIZX8B8TGQpG7Xwpnz',
                          _score: 1.0,
                          _source: {
                            event: {
                              outcome: 'success',
                            },
                            message:
                              "rule executed: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule'",
                          },
                        },
                      ],
                    },
                  },
                  scheduleDelay: {
                    value: 3.126e9,
                  },
                  totalSearchDuration: {
                    value: 0.0,
                  },
                  esSearchDuration: {
                    value: 0.0,
                  },
                  executionDuration: {
                    value: 1.165e9,
                  },
                  executeStartTime: {
                    value: 1.646667545604e12,
                    value_as_string: '2022-03-07T15:39:05.604Z',
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
              },
            ],
          },
          executionUuidCardinality: {
            value: 374,
          },
        },
      },
    };
    expect(formatExecutionLogResult(results)).toEqual({
      total: 374,
      data: [
        {
          id: '6705da7d-2635-499d-a6a8-1aee1ae1eac9',
          timestamp: '2022-03-07T15:38:32.617Z',
          duration_ms: 1056,
          status: 'success',
          message:
            "rule executed: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule'",
          num_active_alerts: 5,
          num_new_alerts: 5,
          num_recovered_alerts: 0,
          num_triggered_actions: 5,
          num_scheduled_actions: 5,
          num_succeeded_actions: 5,
          num_errored_actions: 0,
          total_search_duration_ms: 0,
          es_search_duration_ms: 0,
          timed_out: false,
          schedule_delay_ms: 3074,
        },
        {
          id: '41b2755e-765a-4044-9745-b03875d5e79a',
          timestamp: '2022-03-07T15:39:05.604Z',
          duration_ms: 1165,
          status: 'success',
          message:
            "rule executed: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule'",
          num_active_alerts: 5,
          num_new_alerts: 5,
          num_recovered_alerts: 5,
          num_triggered_actions: 5,
          num_scheduled_actions: 5,
          num_succeeded_actions: 5,
          num_errored_actions: 0,
          total_search_duration_ms: 0,
          es_search_duration_ms: 0,
          timed_out: false,
          schedule_delay_ms: 3126,
        },
      ],
    });
  });

  test('should format results correctly with rule execution errors', () => {
    const results = {
      aggregations: {
        excludeExecuteStart: {
          meta: {},
          doc_count: 875,
          executionUuid: {
            meta: {},
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: '6705da7d-2635-499d-a6a8-1aee1ae1eac9',
                doc_count: 27,
                timeoutMessage: {
                  meta: {},
                  doc_count: 0,
                },
                alertCounts: {
                  meta: {},
                  buckets: {
                    activeAlerts: {
                      doc_count: 5,
                    },
                    newAlerts: {
                      doc_count: 5,
                    },
                    recoveredAlerts: {
                      doc_count: 0,
                    },
                  },
                },
                ruleExecution: {
                  meta: {},
                  doc_count: 1,
                  numTriggeredActions: {
                    value: 5.0,
                  },
                  numScheduledActions: {
                    value: 5.0,
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
                          _id: 'S4wIZX8B8TGQpG7XQZns',
                          _score: 1.0,
                          _source: {
                            event: {
                              outcome: 'failure',
                            },
                            message:
                              "rule execution failure: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule'",
                            error: {
                              message: 'I am erroring in rule execution!!',
                            },
                          },
                        },
                      ],
                    },
                  },
                  scheduleDelay: {
                    value: 3.074e9,
                  },
                  totalSearchDuration: {
                    value: 0.0,
                  },
                  esSearchDuration: {
                    value: 0.0,
                  },
                  executionDuration: {
                    value: 1.056e9,
                  },
                  executeStartTime: {
                    value: 1.646667512617e12,
                    value_as_string: '2022-03-07T15:38:32.617Z',
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
              },
              {
                key: '41b2755e-765a-4044-9745-b03875d5e79a',
                doc_count: 32,
                timeoutMessage: {
                  meta: {},
                  doc_count: 0,
                },
                alertCounts: {
                  meta: {},
                  buckets: {
                    activeAlerts: {
                      doc_count: 5,
                    },
                    newAlerts: {
                      doc_count: 5,
                    },
                    recoveredAlerts: {
                      doc_count: 5,
                    },
                  },
                },
                ruleExecution: {
                  meta: {},
                  doc_count: 1,
                  numTriggeredActions: {
                    value: 5.0,
                  },
                  numScheduledActions: {
                    value: 5.0,
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
                          _id: 'a4wIZX8B8TGQpG7Xwpnz',
                          _score: 1.0,
                          _source: {
                            event: {
                              outcome: 'success',
                            },
                            message:
                              "rule executed: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule'",
                          },
                        },
                      ],
                    },
                  },
                  scheduleDelay: {
                    value: 3.126e9,
                  },
                  totalSearchDuration: {
                    value: 0.0,
                  },
                  esSearchDuration: {
                    value: 0.0,
                  },
                  executionDuration: {
                    value: 1.165e9,
                  },
                  executeStartTime: {
                    value: 1.646667545604e12,
                    value_as_string: '2022-03-07T15:39:05.604Z',
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
              },
            ],
          },
          executionUuidCardinality: {
            value: 374,
          },
        },
      },
    };
    expect(formatExecutionLogResult(results)).toEqual({
      total: 374,
      data: [
        {
          id: '6705da7d-2635-499d-a6a8-1aee1ae1eac9',
          timestamp: '2022-03-07T15:38:32.617Z',
          duration_ms: 1056,
          status: 'failure',
          message:
            "rule execution failure: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule' - I am erroring in rule execution!!",
          num_active_alerts: 5,
          num_new_alerts: 5,
          num_recovered_alerts: 0,
          num_triggered_actions: 5,
          num_scheduled_actions: 5,
          num_succeeded_actions: 5,
          num_errored_actions: 0,
          total_search_duration_ms: 0,
          es_search_duration_ms: 0,
          timed_out: false,
          schedule_delay_ms: 3074,
        },
        {
          id: '41b2755e-765a-4044-9745-b03875d5e79a',
          timestamp: '2022-03-07T15:39:05.604Z',
          duration_ms: 1165,
          status: 'success',
          message:
            "rule executed: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule'",
          num_active_alerts: 5,
          num_new_alerts: 5,
          num_recovered_alerts: 5,
          num_triggered_actions: 5,
          num_scheduled_actions: 5,
          num_succeeded_actions: 5,
          num_errored_actions: 0,
          total_search_duration_ms: 0,
          es_search_duration_ms: 0,
          timed_out: false,
          schedule_delay_ms: 3126,
        },
      ],
    });
  });

  test('should format results correctly when execution timeouts occur', () => {
    const results = {
      aggregations: {
        excludeExecuteStart: {
          meta: {},
          doc_count: 875,
          executionUuid: {
            meta: {},
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: '09b5aeab-d50d-43b2-88e7-f1a20f682b3f',
                doc_count: 3,
                timeoutMessage: {
                  meta: {},
                  doc_count: 1,
                },
                alertCounts: {
                  meta: {},
                  buckets: {
                    activeAlerts: {
                      doc_count: 0,
                    },
                    newAlerts: {
                      doc_count: 0,
                    },
                    recoveredAlerts: {
                      doc_count: 0,
                    },
                  },
                },
                ruleExecution: {
                  meta: {},
                  doc_count: 1,
                  numTriggeredActions: {
                    value: 0.0,
                  },
                  numScheduledActions: {
                    value: 0.0,
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
                          _id: 'dJkWa38B1ylB1EvsAckB',
                          _score: 1.0,
                          _source: {
                            event: {
                              outcome: 'success',
                            },
                            message:
                              "rule executed: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule'",
                          },
                        },
                      ],
                    },
                  },
                  scheduleDelay: {
                    value: 3.074e9,
                  },
                  totalSearchDuration: {
                    value: 0.0,
                  },
                  esSearchDuration: {
                    value: 0.0,
                  },
                  executionDuration: {
                    value: 1.0279e10,
                  },
                  executeStartTime: {
                    value: 1.646769067607e12,
                    value_as_string: '2022-03-08T19:51:07.607Z',
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
              },
              {
                key: '41b2755e-765a-4044-9745-b03875d5e79a',
                doc_count: 32,
                timeoutMessage: {
                  meta: {},
                  doc_count: 0,
                },
                alertCounts: {
                  meta: {},
                  buckets: {
                    activeAlerts: {
                      doc_count: 5,
                    },
                    newAlerts: {
                      doc_count: 5,
                    },
                    recoveredAlerts: {
                      doc_count: 5,
                    },
                  },
                },
                ruleExecution: {
                  meta: {},
                  doc_count: 1,
                  numTriggeredActions: {
                    value: 5.0,
                  },
                  numScheduledActions: {
                    value: 5.0,
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
                          _id: 'a4wIZX8B8TGQpG7Xwpnz',
                          _score: 1.0,
                          _source: {
                            event: {
                              outcome: 'success',
                            },
                            message:
                              "rule executed: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule'",
                          },
                        },
                      ],
                    },
                  },
                  scheduleDelay: {
                    value: 3.126e9,
                  },
                  totalSearchDuration: {
                    value: 0.0,
                  },
                  esSearchDuration: {
                    value: 0.0,
                  },
                  executionDuration: {
                    value: 1.165e9,
                  },
                  executeStartTime: {
                    value: 1.646667545604e12,
                    value_as_string: '2022-03-07T15:39:05.604Z',
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
              },
            ],
          },
          executionUuidCardinality: {
            value: 374,
          },
        },
      },
    };
    expect(formatExecutionLogResult(results)).toEqual({
      total: 374,
      data: [
        {
          id: '09b5aeab-d50d-43b2-88e7-f1a20f682b3f',
          timestamp: '2022-03-08T19:51:07.607Z',
          duration_ms: 10279,
          status: 'success',
          message:
            "rule executed: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule'",
          num_active_alerts: 0,
          num_new_alerts: 0,
          num_recovered_alerts: 0,
          num_triggered_actions: 0,
          num_scheduled_actions: 0,
          num_succeeded_actions: 0,
          num_errored_actions: 0,
          total_search_duration_ms: 0,
          es_search_duration_ms: 0,
          timed_out: true,
          schedule_delay_ms: 3074,
        },
        {
          id: '41b2755e-765a-4044-9745-b03875d5e79a',
          timestamp: '2022-03-07T15:39:05.604Z',
          duration_ms: 1165,
          status: 'success',
          message:
            "rule executed: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule'",
          num_active_alerts: 5,
          num_new_alerts: 5,
          num_recovered_alerts: 5,
          num_triggered_actions: 5,
          num_scheduled_actions: 5,
          num_succeeded_actions: 5,
          num_errored_actions: 0,
          total_search_duration_ms: 0,
          es_search_duration_ms: 0,
          timed_out: false,
          schedule_delay_ms: 3126,
        },
      ],
    });
  });

  test('should format results correctly when action errors occur', () => {
    const results = {
      aggregations: {
        excludeExecuteStart: {
          meta: {},
          doc_count: 875,
          executionUuid: {
            meta: {},
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'ecf7ac4c-1c15-4a1d-818a-cacbf57f6158',
                doc_count: 32,
                timeoutMessage: {
                  meta: {},
                  doc_count: 0,
                },
                alertCounts: {
                  meta: {},
                  buckets: {
                    activeAlerts: {
                      doc_count: 5,
                    },
                    newAlerts: {
                      doc_count: 5,
                    },
                    recoveredAlerts: {
                      doc_count: 5,
                    },
                  },
                },
                ruleExecution: {
                  meta: {},
                  doc_count: 1,
                  numTriggeredActions: {
                    value: 5.0,
                  },
                  numScheduledActions: {
                    value: 5.0,
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
                          _id: '7xKcb38BcntAq5ycFwiu',
                          _score: 1.0,
                          _source: {
                            event: {
                              outcome: 'success',
                            },
                            message:
                              "rule executed: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule'",
                          },
                        },
                      ],
                    },
                  },
                  scheduleDelay: {
                    value: 3.126e9,
                  },
                  totalSearchDuration: {
                    value: 0.0,
                  },
                  esSearchDuration: {
                    value: 0.0,
                  },
                  executionDuration: {
                    value: 1.374e9,
                  },
                  executeStartTime: {
                    value: 1.646844973039e12,
                    value_as_string: '2022-03-09T16:56:13.039Z',
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
                        key: 'failure',
                        doc_count: 5,
                      },
                    ],
                  },
                },
              },
              {
                key: '61bb867b-661a-471f-bf92-23471afa10b3',
                doc_count: 32,
                timeoutMessage: {
                  meta: {},
                  doc_count: 0,
                },
                alertCounts: {
                  meta: {},
                  buckets: {
                    activeAlerts: {
                      doc_count: 5,
                    },
                    newAlerts: {
                      doc_count: 5,
                    },
                    recoveredAlerts: {
                      doc_count: 5,
                    },
                  },
                },
                ruleExecution: {
                  meta: {},
                  doc_count: 1,
                  numTriggeredActions: {
                    value: 5.0,
                  },
                  numScheduledActions: {
                    value: 5.0,
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
                          _id: 'zRKbb38BcntAq5ycOwgk',
                          _score: 1.0,
                          _source: {
                            event: {
                              outcome: 'success',
                            },
                            message:
                              "rule executed: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule'",
                          },
                        },
                      ],
                    },
                  },
                  scheduleDelay: {
                    value: 3.133e9,
                  },
                  totalSearchDuration: {
                    value: 0.0,
                  },
                  esSearchDuration: {
                    value: 0.0,
                  },
                  executionDuration: {
                    value: 4.18e8,
                  },
                  executeStartTime: {
                    value: 1.646844917518e12,
                    value_as_string: '2022-03-09T16:55:17.518Z',
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
              },
            ],
          },
          executionUuidCardinality: {
            value: 417,
          },
        },
      },
    };
    expect(formatExecutionLogResult(results)).toEqual({
      total: 417,
      data: [
        {
          id: 'ecf7ac4c-1c15-4a1d-818a-cacbf57f6158',
          timestamp: '2022-03-09T16:56:13.039Z',
          duration_ms: 1374,
          status: 'success',
          message:
            "rule executed: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule'",
          num_active_alerts: 5,
          num_new_alerts: 5,
          num_recovered_alerts: 5,
          num_triggered_actions: 5,
          num_scheduled_actions: 5,
          num_succeeded_actions: 0,
          num_errored_actions: 5,
          total_search_duration_ms: 0,
          es_search_duration_ms: 0,
          timed_out: false,
          schedule_delay_ms: 3126,
        },
        {
          id: '61bb867b-661a-471f-bf92-23471afa10b3',
          timestamp: '2022-03-09T16:55:17.518Z',
          duration_ms: 418,
          status: 'success',
          message:
            "rule executed: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule'",
          num_active_alerts: 5,
          num_new_alerts: 5,
          num_recovered_alerts: 5,
          num_triggered_actions: 5,
          num_scheduled_actions: 5,
          num_succeeded_actions: 5,
          num_errored_actions: 0,
          total_search_duration_ms: 0,
          es_search_duration_ms: 0,
          timed_out: false,
          schedule_delay_ms: 3133,
        },
      ],
    });
  });
});
