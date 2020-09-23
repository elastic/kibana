/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createWorkloadAggregator } from './workload_statistics';
import { taskManagerMock } from '../task_manager.mock';
import { first, take, bufferCount } from 'rxjs/operators';
import { AggregationResult } from '../queries/aggregation_clauses';
import { mockLogger } from '../test_utils';

describe('Workload Statistics Aggregator', () => {
  test('queries the Task Store at a fixed interval for the current workload', async () => {
    const taskManager = taskManagerMock.create();
    taskManager.aggregate.mockResolvedValue(({
      task: {
        doc_count: 0,
        taskType: {
          buckets: [],
        },
        schedule: {
          buckets: [],
        },
      },
    } as unknown) as AggregationResult<string>);

    const workloadAggregator = createWorkloadAggregator(taskManager, 10, mockLogger());

    return new Promise((resolve) => {
      workloadAggregator.pipe(first()).subscribe(() => {
        expect(taskManager.aggregate).toHaveBeenCalledWith({
          aggs: {
            taskType: {
              terms: { field: 'task.taskType' },
              aggs: {
                status: {
                  terms: { field: 'task.status' },
                },
              },
            },
            schedule: {
              terms: {
                field: 'task.schedule.interval',
              },
            },
          },
        });
        resolve();
      });
    });
  });

  const mockAggregatedResult = ({
    task: {
      doc_count: 4,
      schedule: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: '3600s',
            doc_count: 1,
          },
          {
            key: '60s',
            doc_count: 1,
          },
          {
            key: '720m',
            doc_count: 1,
          },
        ],
      },
      taskType: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: 'actions_telemetry',
            doc_count: 2,
            status: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'idle',
                  doc_count: 2,
                },
              ],
            },
          },
          {
            key: 'alerting_telemetry',
            doc_count: 1,
            status: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'idle',
                  doc_count: 1,
                },
              ],
            },
          },
          {
            key: 'session_cleanup',
            doc_count: 1,
            status: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'idle',
                  doc_count: 1,
                },
              ],
            },
          },
        ],
      },
    },
  } as unknown) as AggregationResult<string>;

  function setTaskTypeCount(
    result: AggregationResult<string>,
    taskType: string,
    status: Record<string, number>
  ) {
    const buckets = [
      ...result.task.taskType.buckets.filter(({ key }) => key !== taskType),
      {
        key: taskType,
        doc_count: Object.values(status).reduce((sum, count) => sum + count, 0),
        status: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: Object.entries(status).map(([key, count]) => ({
            key,
            doc_count: count,
          })),
        },
      },
    ];
    return ({
      task: {
        doc_count: buckets.reduce((sum, bucket) => sum + bucket.doc_count, 0),
        taskType: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets,
        },
      },
    } as unknown) as AggregationResult<string>;
  }

  test('returns a summary of the workload by task type', async () => {
    const taskManager = taskManagerMock.create();
    taskManager.aggregate.mockResolvedValue(mockAggregatedResult);

    const workloadAggregator = createWorkloadAggregator(taskManager, 10, mockLogger());

    return new Promise((resolve) => {
      workloadAggregator.pipe(first()).subscribe((result) => {
        expect(result.key).toEqual('workload');
        expect(result.value).toMatchObject({
          sum: 4,
          taskTypes: {
            actions_telemetry: { sum: 2, status: { idle: 2 } },
            alerting_telemetry: { sum: 1, status: { idle: 1 } },
            session_cleanup: { sum: 1, status: { idle: 1 } },
          },
        });
        resolve();
      });
    });
  });

  test('recovers from errors fetching the workload', async () => {
    const taskManager = taskManagerMock.create();
    taskManager.aggregate
      .mockResolvedValueOnce(
        setTaskTypeCount(mockAggregatedResult, 'alerting_telemetry', {
          idle: 2,
        })
      )
      .mockRejectedValueOnce(new Error('Elasticsearch has gone poof'))
      .mockResolvedValueOnce(
        setTaskTypeCount(mockAggregatedResult, 'alerting_telemetry', {
          idle: 1,
          failed: 1,
        })
      );
    const logger = mockLogger();
    const workloadAggregator = createWorkloadAggregator(taskManager, 10, logger);

    return new Promise((resolve) => {
      workloadAggregator.pipe(take(2), bufferCount(2)).subscribe((results) => {
        expect(results[0].key).toEqual('workload');
        expect(results[0].value).toMatchObject({
          sum: 5,
          taskTypes: {
            actions_telemetry: { sum: 2, status: { idle: 2 } },
            alerting_telemetry: { sum: 2, status: { idle: 2 } },
            session_cleanup: { sum: 1, status: { idle: 1 } },
          },
        });
        expect(results[1].key).toEqual('workload');
        expect(results[1].value).toMatchObject({
          sum: 5,
          taskTypes: {
            actions_telemetry: { sum: 2, status: { idle: 2 } },
            alerting_telemetry: { sum: 2, status: { idle: 1, failed: 1 } },
            session_cleanup: { sum: 1, status: { idle: 1 } },
          },
        });
        resolve();
      });
    });
  });
});
