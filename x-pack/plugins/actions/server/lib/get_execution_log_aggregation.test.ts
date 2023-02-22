/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression } from '@kbn/es-query';
import {
  getExecutionLogAggregation,
  formatExecutionLogResult,
  ExecutionUuidAggResult,
  getExecutionKPIAggregation,
  formatExecutionKPIResult,
} from './get_execution_log_aggregation';

describe('getExecutionLogAggregation', () => {
  test('should throw error when given bad sort field', () => {
    expect(() => {
      getExecutionLogAggregation({
        page: 1,
        perPage: 10,
        sort: [{ notsortable: { order: 'asc' } }],
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"Invalid sort field \\"notsortable\\" - must be one of [timestamp,execution_duration,schedule_delay]"`
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
      `"Invalid sort field \\"notsortable\\" - must be one of [timestamp,execution_duration,schedule_delay]"`
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
      executionLogAgg: {
        aggs: {
          executionUuid: {
            aggs: {
              actionExecution: {
                aggs: {
                  executeStartTime: {
                    min: {
                      field: 'event.start',
                    },
                  },
                  executionDuration: {
                    max: {
                      field: 'event.duration',
                    },
                  },
                  outcomeAndMessage: {
                    top_hits: {
                      _source: {
                        includes: [
                          'event.outcome',
                          'message',
                          'error.message',
                          'kibana.version',
                          'kibana.space_ids',
                          'kibana.action.name',
                          'kibana.action.id',
                        ],
                      },
                    },
                  },
                  scheduleDelay: {
                    max: {
                      field: 'kibana.task.schedule_delay',
                    },
                  },
                },
                filter: {
                  bool: {
                    must: [
                      {
                        match: {
                          'event.action': 'execute',
                        },
                      },
                    ],
                  },
                },
              },
              executionUuidSorted: {
                bucket_sort: {
                  from: 10,
                  gap_policy: 'insert_zeros',
                  size: 10,
                  sort: [
                    {
                      'actionExecution>executeStartTime': {
                        order: 'asc',
                      },
                    },
                    {
                      'actionExecution>executionDuration': {
                        order: 'desc',
                      },
                    },
                  ],
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
                    ],
                  },
                },
              },
            },
            terms: {
              field: 'kibana.action.execution.uuid',
              order: [
                {
                  'actionExecution>executeStartTime': 'asc',
                },
                {
                  'actionExecution>executionDuration': 'desc',
                },
              ],
              size: 1000,
            },
          },
          executionUuidCardinality: {
            aggs: {
              executionUuidCardinality: {
                cardinality: {
                  field: 'kibana.action.execution.uuid',
                },
              },
            },
            filter: {
              bool: {
                must: [
                  {
                    match: {
                      'event.action': 'execute',
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

  test('should correctly generate aggregation with a defined filter in the form of a string', () => {
    expect(
      getExecutionLogAggregation({
        page: 2,
        perPage: 10,
        sort: [{ timestamp: { order: 'asc' } }, { execution_duration: { order: 'desc' } }],
        filter: 'test:test',
      })
    ).toEqual({
      executionLogAgg: {
        aggs: {
          executionUuid: {
            aggs: {
              actionExecution: {
                aggs: {
                  executeStartTime: {
                    min: {
                      field: 'event.start',
                    },
                  },
                  executionDuration: {
                    max: {
                      field: 'event.duration',
                    },
                  },
                  outcomeAndMessage: {
                    top_hits: {
                      _source: {
                        includes: [
                          'event.outcome',
                          'message',
                          'error.message',
                          'kibana.version',
                          'kibana.space_ids',
                          'kibana.action.name',
                          'kibana.action.id',
                        ],
                      },
                    },
                  },
                  scheduleDelay: {
                    max: {
                      field: 'kibana.task.schedule_delay',
                    },
                  },
                },
                filter: {
                  bool: {
                    must: [
                      {
                        match: {
                          'event.action': 'execute',
                        },
                      },
                    ],
                  },
                },
              },
              executionUuidSorted: {
                bucket_sort: {
                  from: 10,
                  gap_policy: 'insert_zeros',
                  size: 10,
                  sort: [
                    {
                      'actionExecution>executeStartTime': {
                        order: 'asc',
                      },
                    },
                    {
                      'actionExecution>executionDuration': {
                        order: 'desc',
                      },
                    },
                  ],
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
                    ],
                  },
                },
              },
            },
            terms: {
              field: 'kibana.action.execution.uuid',
              order: [
                {
                  'actionExecution>executeStartTime': 'asc',
                },
                {
                  'actionExecution>executionDuration': 'desc',
                },
              ],
              size: 1000,
            },
          },
          executionUuidCardinality: {
            aggs: {
              executionUuidCardinality: {
                cardinality: {
                  field: 'kibana.action.execution.uuid',
                },
              },
            },
            filter: {
              bool: {
                must: [
                  {
                    match: {
                      'event.action': 'execute',
                    },
                  },
                ],
              },
            },
          },
        },
        filter: {
          bool: {
            filter: {
              bool: {
                minimum_should_match: 1,
                should: [
                  {
                    match: {
                      test: 'test',
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

  test('should correctly generate aggregation with a defined filter in the form of a KueryNode', () => {
    expect(
      getExecutionLogAggregation({
        page: 2,
        perPage: 10,
        sort: [{ timestamp: { order: 'asc' } }, { execution_duration: { order: 'desc' } }],
        filter: fromKueryExpression('test:test'),
      })
    ).toEqual({
      executionLogAgg: {
        aggs: {
          executionUuid: {
            aggs: {
              actionExecution: {
                aggs: {
                  executeStartTime: {
                    min: {
                      field: 'event.start',
                    },
                  },
                  executionDuration: {
                    max: {
                      field: 'event.duration',
                    },
                  },
                  outcomeAndMessage: {
                    top_hits: {
                      _source: {
                        includes: [
                          'event.outcome',
                          'message',
                          'error.message',
                          'kibana.version',
                          'kibana.space_ids',
                          'kibana.action.name',
                          'kibana.action.id',
                        ],
                      },
                    },
                  },
                  scheduleDelay: {
                    max: {
                      field: 'kibana.task.schedule_delay',
                    },
                  },
                },
                filter: {
                  bool: {
                    must: [
                      {
                        match: {
                          'event.action': 'execute',
                        },
                      },
                    ],
                  },
                },
              },
              executionUuidSorted: {
                bucket_sort: {
                  from: 10,
                  gap_policy: 'insert_zeros',
                  size: 10,
                  sort: [
                    {
                      'actionExecution>executeStartTime': {
                        order: 'asc',
                      },
                    },
                    {
                      'actionExecution>executionDuration': {
                        order: 'desc',
                      },
                    },
                  ],
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
                    ],
                  },
                },
              },
            },
            terms: {
              field: 'kibana.action.execution.uuid',
              order: [
                {
                  'actionExecution>executeStartTime': 'asc',
                },
                {
                  'actionExecution>executionDuration': 'desc',
                },
              ],
              size: 1000,
            },
          },
          executionUuidCardinality: {
            aggs: {
              executionUuidCardinality: {
                cardinality: {
                  field: 'kibana.action.execution.uuid',
                },
              },
            },
            filter: {
              bool: {
                must: [
                  {
                    match: {
                      'event.action': 'execute',
                    },
                  },
                ],
              },
            },
          },
        },
        filter: {
          bool: {
            filter: {
              bool: {
                minimum_should_match: 1,
                should: [
                  {
                    match: {
                      test: 'test',
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

describe('formatExecutionLogResult', () => {
  test('should return empty results if aggregations are undefined', () => {
    expect(formatExecutionLogResult({ aggregations: undefined })).toEqual({
      total: 0,
      data: [],
    });
  });
  test('should return empty results if aggregations.executionLogAgg are undefined', () => {
    expect(
      formatExecutionLogResult({
        aggregations: { executionLogAgg: undefined as unknown as ExecutionUuidAggResult },
      })
    ).toEqual({
      total: 0,
      data: [],
    });
  });
  test('should format results correctly', () => {
    const results = {
      aggregations: {
        executionLogAgg: {
          doc_count: 5,
          executionUuid: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: '8b3af07e-7593-4c40-b704-9c06d3b06e58',
                doc_count: 1,
                actionExecution: {
                  doc_count: 1,
                  scheduleDelay: { value: 2783000000 },
                  outcomeAndMessage: {
                    hits: {
                      total: { value: 1, relation: 'eq' },
                      max_score: 3.033605,
                      hits: [
                        {
                          _index: '.kibana-event-log-8.7.0-000001',
                          _id: '5SmlgoUBAOza-PIJVKGD',
                          _score: 3.033605,
                          _source: {
                            event: { outcome: 'success' },
                            kibana: {
                              space_ids: ['default'],
                              version: '8.7.0',
                              action: { name: 'test connector', id: '1' },
                            },
                            message:
                              'action executed: .server-log:6709f660-8d11-11ed-bae5-bd32cbc9eaaa: test connector',
                          },
                        },
                      ],
                    },
                  },
                  executionDuration: { value: 1000000 },
                  executeStartTime: {
                    value: 1672934150495,
                    value_as_string: '2023-01-05T15:55:50.495Z',
                  },
                },
              },
            ],
          },
          executionUuidCardinality: { doc_count: 1, executionUuidCardinality: { value: 1 } },
        },
      },
    };
    expect(formatExecutionLogResult(results)).toEqual({
      data: [
        {
          connector_name: 'test connector',
          connector_id: '1',
          duration_ms: 1,
          id: '8b3af07e-7593-4c40-b704-9c06d3b06e58',
          message:
            'action executed: .server-log:6709f660-8d11-11ed-bae5-bd32cbc9eaaa: test connector',
          schedule_delay_ms: 2783,
          space_ids: ['default'],
          status: 'success',
          timestamp: '2023-01-05T15:55:50.495Z',
          version: '8.7.0',
          timed_out: false,
        },
      ],
      total: 1,
    });
  });

  test('should format results correctly with action execution errors', () => {
    const results = {
      aggregations: {
        executionLogAgg: {
          doc_count: 10,
          executionUuid: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'fdf9cadb-4568-4d22-afd2-437e4efbe767',
                doc_count: 1,
                actionExecution: {
                  doc_count: 1,
                  scheduleDelay: { value: 2946000000 },
                  outcomeAndMessage: {
                    hits: {
                      total: { value: 1, relation: 'eq' },
                      max_score: 3.1420498,
                      hits: [
                        {
                          _index: '.kibana-event-log-8.7.0-000001',
                          _id: 'CSm_goUBAOza-PIJBaIn',
                          _score: 3.1420498,
                          _source: {
                            event: { outcome: 'failure' },
                            kibana: {
                              space_ids: ['default'],
                              version: '8.7.0',
                              action: { name: 'test', id: '1' },
                            },
                            message:
                              'action execution failure: .email:e020c620-8d14-11ed-bae5-bd32cbc9eaaa: test',
                            error: {
                              message:
                                'action execution failure: .email:e020c620-8d14-11ed-bae5-bd32cbc9eaaa: test',
                            },
                          },
                        },
                      ],
                    },
                  },
                  executionDuration: { value: 441000000 },
                  executeStartTime: {
                    value: 1672935833813,
                    value_as_string: '2023-01-05T16:23:53.813Z',
                  },
                },
              },
              {
                key: '8b3af07e-7593-4c40-b704-9c06d3b06e58',
                doc_count: 1,
                actionExecution: {
                  doc_count: 1,
                  scheduleDelay: { value: 2783000000 },
                  outcomeAndMessage: {
                    hits: {
                      total: { value: 1, relation: 'eq' },
                      max_score: 3.1420498,
                      hits: [
                        {
                          _index: '.kibana-event-log-8.7.0-000001',
                          _id: '5SmlgoUBAOza-PIJVKGD',
                          _score: 3.1420498,
                          _source: {
                            event: { outcome: 'success' },
                            kibana: {
                              space_ids: ['default'],
                              version: '8.7.0',
                              action: { name: 'test connector', id: '1' },
                            },
                            message:
                              'action executed: .server-log:6709f660-8d11-11ed-bae5-bd32cbc9eaaa: test connector',
                          },
                        },
                      ],
                    },
                  },
                  executionDuration: { value: 1000000 },
                  executeStartTime: {
                    value: 1672934150495,
                    value_as_string: '2023-01-05T15:55:50.495Z',
                  },
                },
              },
            ],
          },
          executionUuidCardinality: { doc_count: 2, executionUuidCardinality: { value: 2 } },
        },
      },
    };
    expect(formatExecutionLogResult(results)).toEqual({
      data: [
        {
          connector_name: 'test',
          connector_id: '1',
          duration_ms: 441,
          id: 'fdf9cadb-4568-4d22-afd2-437e4efbe767',
          message:
            'action execution failure: .email:e020c620-8d14-11ed-bae5-bd32cbc9eaaa: test - action execution failure: .email:e020c620-8d14-11ed-bae5-bd32cbc9eaaa: test',
          schedule_delay_ms: 2946,
          space_ids: ['default'],
          status: 'failure',
          timestamp: '2023-01-05T16:23:53.813Z',
          version: '8.7.0',
          timed_out: false,
        },
        {
          connector_name: 'test connector',
          connector_id: '1',
          duration_ms: 1,
          id: '8b3af07e-7593-4c40-b704-9c06d3b06e58',
          message:
            'action executed: .server-log:6709f660-8d11-11ed-bae5-bd32cbc9eaaa: test connector',
          schedule_delay_ms: 2783,
          space_ids: ['default'],
          status: 'success',
          timestamp: '2023-01-05T15:55:50.495Z',
          version: '8.7.0',
          timed_out: false,
        },
      ],
      total: 2,
    });
  });
});

describe('getExecutionKPIAggregation', () => {
  test('should correctly generate aggregation', () => {
    expect(getExecutionKPIAggregation()).toEqual({
      executionKpiAgg: {
        aggs: {
          executionUuid: {
            aggs: {
              actionExecution: {
                aggs: {
                  actionExecutionOutcomes: {
                    terms: {
                      field: 'event.outcome',
                      size: 3,
                    },
                  },
                  executeStartTime: {
                    min: {
                      field: 'event.start',
                    },
                  },
                },
                filter: {
                  bool: {
                    must: [
                      {
                        match: {
                          'event.action': 'execute',
                        },
                      },
                    ],
                  },
                },
              },
              executionUuidSorted: {
                bucket_sort: {
                  from: 0,
                  gap_policy: 'insert_zeros',
                  size: 10000,
                },
              },
            },
            terms: {
              field: 'kibana.action.execution.uuid',
              order: [
                {
                  'actionExecution>executeStartTime': 'desc',
                },
              ],
              size: 10000,
            },
          },
        },
      },
    });
  });

  test('should correctly generate aggregation with a defined filter in the form of a string', () => {
    expect(getExecutionKPIAggregation('test:test')).toEqual({
      executionKpiAgg: {
        aggs: {
          executionUuid: {
            aggs: {
              actionExecution: {
                aggs: {
                  actionExecutionOutcomes: {
                    terms: {
                      field: 'event.outcome',
                      size: 3,
                    },
                  },
                  executeStartTime: {
                    min: {
                      field: 'event.start',
                    },
                  },
                },
                filter: {
                  bool: {
                    must: [
                      {
                        match: {
                          'event.action': 'execute',
                        },
                      },
                    ],
                  },
                },
              },
              executionUuidSorted: {
                bucket_sort: {
                  from: 0,
                  gap_policy: 'insert_zeros',
                  size: 10000,
                },
              },
            },
            terms: {
              field: 'kibana.action.execution.uuid',
              order: [
                {
                  'actionExecution>executeStartTime': 'desc',
                },
              ],
              size: 10000,
            },
          },
        },
        filter: {
          bool: {
            filter: {
              bool: {
                minimum_should_match: 1,
                should: [
                  {
                    match: {
                      test: 'test',
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

  test('should correctly generate aggregation with a defined filter in the form of a KueryNode', () => {
    expect(getExecutionKPIAggregation(fromKueryExpression('test:test'))).toEqual({
      executionKpiAgg: {
        aggs: {
          executionUuid: {
            aggs: {
              actionExecution: {
                aggs: {
                  actionExecutionOutcomes: {
                    terms: {
                      field: 'event.outcome',
                      size: 3,
                    },
                  },
                  executeStartTime: {
                    min: {
                      field: 'event.start',
                    },
                  },
                },
                filter: {
                  bool: {
                    must: [
                      {
                        match: {
                          'event.action': 'execute',
                        },
                      },
                    ],
                  },
                },
              },
              executionUuidSorted: {
                bucket_sort: {
                  from: 0,
                  gap_policy: 'insert_zeros',
                  size: 10000,
                },
              },
            },
            terms: {
              field: 'kibana.action.execution.uuid',
              order: [
                {
                  'actionExecution>executeStartTime': 'desc',
                },
              ],
              size: 10000,
            },
          },
        },
        filter: {
          bool: {
            filter: {
              bool: {
                minimum_should_match: 1,
                should: [
                  {
                    match: {
                      test: 'test',
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

describe('formatExecutionKPIAggBuckets', () => {
  test('should return empty results if aggregations are undefined', () => {
    expect(
      formatExecutionKPIResult({
        aggregations: undefined,
      })
    ).toEqual({ failure: 0, success: 0, unknown: 0, warning: 0 });
  });

  test('should format results correctly', () => {
    const results = {
      aggregations: {
        executionKpiAgg: {
          doc_count: 21,
          executionUuid: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: '8b3af07e-7593-4c40-b704-9c06d3b06e58',
                doc_count: 1,
                actionExecution: {
                  doc_count: 1,
                  actionExecutionOutcomes: {
                    doc_count_error_upper_bound: 0,
                    sum_other_doc_count: 0,
                    buckets: [{ key: 'success', doc_count: 1 }],
                  },
                  executeStartTime: {
                    value: 1672934150495,
                    value_as_string: '2023-01-05T15:55:50.495Z',
                  },
                },
              },
            ],
          },
        },
      },
    };

    expect(formatExecutionKPIResult(results)).toEqual({
      failure: 0,
      success: 1,
      unknown: 0,
      warning: 0,
    });
  });
});
