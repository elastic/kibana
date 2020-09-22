/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createWorkloadAggregator } from './workload_statistics';
import { taskManagerMock } from '../task_manager.mock';
import { first } from 'rxjs/operators';
import { AggregationResult } from '../queries/aggregation_clauses';

describe('Workload Statistics Aggregator', () => {
  test('queries the Task Store at a fixed interval for the current workload', async () => {
    const taskManager = taskManagerMock.create();
    taskManager.aggregate.mockResolvedValue(({
      task: {
        doc_count: 0,
        taskType: {
          buckets: [],
        },
      },
    } as unknown) as AggregationResult<string>);

    const workloadAggregator = createWorkloadAggregator(taskManager, 10);

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
          },
        });
        resolve();
      });
    });
  });

  test('returns a summary of the workload by task type', async () => {
    const taskManager = taskManagerMock.create();
    taskManager.aggregate.mockResolvedValue(({
      task: {
        doc_count: 4,
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
    } as unknown) as AggregationResult<string>);

    const workloadAggregator = createWorkloadAggregator(taskManager, 10);

    return new Promise((resolve) => {
      workloadAggregator.pipe(first()).subscribe((result) => {
        expect(result.key).toEqual('workload');
        expect(result.value).toMatchObject({
          sum: 4,
          types: {
            actions_telemetry: { sum: 2, status: { idle: 2 } },
            alerting_telemetry: { sum: 1, status: { idle: 1 } },
            session_cleanup: { sum: 1, status: { idle: 1 } },
          },
        });
        resolve();
      });
    });
  });
});
