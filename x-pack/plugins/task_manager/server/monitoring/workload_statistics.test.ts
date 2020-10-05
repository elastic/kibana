/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first, take, bufferCount } from 'rxjs/operators';
import { WorkloadAggregation, createWorkloadAggregator, padBuckets } from './workload_statistics';
import { taskManagerMock } from '../task_manager.mock';
import { mockLogger } from '../test_utils';
import { ConcreteTaskInstance } from '../task';
import { ESSearchResponse } from '../../../apm/typings/elasticsearch';
import { AggregationResultOf } from '../../../apm/typings/elasticsearch/aggregations';

type MockESResult = ESSearchResponse<
  ConcreteTaskInstance,
  {
    body: WorkloadAggregation;
  }
>;

describe('Workload Statistics Aggregator', () => {
  test('queries the Task Store at a fixed interval for the current workload', async () => {
    const taskManager = taskManagerMock.create();
    taskManager.aggregate.mockResolvedValue({
      hits: {
        hits: [],
        max_score: 0,
        total: { value: 0, relation: 'eq' },
      },
      took: 1,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        skipped: 1,
        failed: 0,
      },
      aggregations: {
        taskType: {
          buckets: [],
        },
        schedule: {
          buckets: [],
        },
        idleTasks: {
          doc_count: 0,
          overdue: {
            doc_count: 0,
          },
          scheduleDensity: {
            buckets: [
              {
                key: '2020-10-02T15:18:37.274Z-2020-10-02T15:19:36.274Z',
                from: 1.601651917274e12,
                from_as_string: '2020-10-02T15:18:37.274Z',
                to: 1.601651976274e12,
                to_as_string: '2020-10-02T15:19:36.274Z',
                doc_count: 0,
                histogram: {
                  buckets: [],
                },
              },
            ],
          },
        },
      },
    } as MockESResult);

    const workloadAggregator = createWorkloadAggregator(taskManager, 10, 3000, mockLogger());

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
            idleTasks: {
              filter: {
                term: { 'task.status': 'idle' },
              },
              aggs: {
                scheduleDensity: {
                  range: {
                    field: 'task.runAt',
                    ranges: [{ from: 'now', to: 'now+1m' }],
                  },
                  aggs: {
                    histogram: {
                      date_histogram: {
                        field: 'task.runAt',
                        fixed_interval: '3s',
                      },
                    },
                  },
                },
                overdue: {
                  filter: {
                    range: {
                      'task.runAt': { lt: 'now' },
                    },
                  },
                },
              },
            },
          },
        });
        resolve();
      });
    });
  });

  const mockAggregatedResult: MockESResult = {
    hits: {
      hits: [],
      max_score: 0,
      total: { value: 4, relation: 'eq' },
    },
    took: 1,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 1,
      failed: 0,
    },
    aggregations: {
      schedule: {
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
        buckets: [
          {
            key: 'actions_telemetry',
            doc_count: 2,
            status: {
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
      idleTasks: {
        doc_count: 13,
        overdue: {
          doc_count: 6,
        },
        scheduleDensity: {
          buckets: [
            mockHistogram(Date.now(), Date.now() + 7 * 3000, Date.now() + 60000, 3000, [
              2,
              2,
              5,
              0,
              0,
              0,
              0,
              0,
              0,
              1,
            ]),
          ],
        },
      },
    },
  };

  test('returns a summary of the workload by task type', async () => {
    const taskManager = taskManagerMock.create();
    taskManager.aggregate.mockResolvedValue(mockAggregatedResult as MockESResult);

    const workloadAggregator = createWorkloadAggregator(taskManager, 10, 3000, mockLogger());

    return new Promise((resolve) => {
      workloadAggregator.pipe(first()).subscribe((result) => {
        expect(result.key).toEqual('workload');
        expect(result.value).toMatchObject({
          count: 4,
          taskTypes: {
            actions_telemetry: { count: 2, status: { idle: 2 } },
            alerting_telemetry: { count: 1, status: { idle: 1 } },
            session_cleanup: { count: 1, status: { idle: 1 } },
          },
        });
        resolve();
      });
    });
  });

  test('returns a count of the overdue workload', async () => {
    const taskManager = taskManagerMock.create();
    taskManager.aggregate.mockResolvedValue(mockAggregatedResult as MockESResult);

    const workloadAggregator = createWorkloadAggregator(taskManager, 10, 3000, mockLogger());

    return new Promise((resolve) => {
      workloadAggregator.pipe(first()).subscribe((result) => {
        expect(result.key).toEqual('workload');
        expect(result.value).toMatchObject({
          overdue: 6,
        });
        resolve();
      });
    });
  });

  test('returns a histogram of the upcoming workload for the upcoming minute when refresh rate is high', async () => {
    const taskManager = taskManagerMock.create();
    taskManager.aggregate.mockResolvedValue(mockAggregatedResult as MockESResult);

    const workloadAggregator = createWorkloadAggregator(taskManager, 10, 3000, mockLogger());

    return new Promise((resolve) => {
      workloadAggregator.pipe(first()).subscribe((result) => {
        expect(result.key).toEqual('workload');
        expect(result.value).toMatchObject({
          // we have intervals every 3s, so we aggregate buckets 3s apart
          // in this mock, Elasticsearch found tasks scheduled in 21 (8th bucket), 24, 27 and 48s seconds from now
          //  0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57
          // [0, 0, 0, 0,  0,  0,  0,  0, 2,  2,  5,  0,  0,  0,  0,  0,  0,  1,  0,  0 ]
          //  Above you see each bucket and the number of scheduled tasks we expect to have in them
          scheduleDensity: [0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 5, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        });
        resolve();
      });
    });
  });

  test('returns a histogram of the upcoming workload for twice refresh rate when rate is low', async () => {
    const taskManager = taskManagerMock.create();
    taskManager.aggregate.mockResolvedValue(mockAggregatedResult as MockESResult);

    const workloadAggregator = createWorkloadAggregator(taskManager, 60 * 1000, 3000, mockLogger());

    return new Promise((resolve) => {
      workloadAggregator.pipe(first()).subscribe((result) => {
        expect(result.key).toEqual('workload');
        expect(result.value).toMatchObject({
          // same schedule density as in previous test, but window of 40 buckets ((60s refresh * 2) / 3s = 40)
          scheduleDensity: [
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            2,
            2,
            5,
            0,
            0,
            0,
            0,
            0,
            0,
            1,
            0,
            0,
            ...new Array(20).fill(0),
          ],
        });
        resolve();
      });
    });
  });

  test('returns a histogram of the upcoming workload maxed out at 50 buckets when rate is too low', async () => {
    const taskManager = taskManagerMock.create();
    taskManager.aggregate.mockResolvedValue(mockAggregatedResult as MockESResult);

    const workloadAggregator = createWorkloadAggregator(
      taskManager,
      15 * 60 * 1000,
      3000,
      mockLogger()
    );

    return new Promise((resolve) => {
      workloadAggregator.pipe(first()).subscribe((result) => {
        expect(result.key).toEqual('workload');
        expect(result.value).toMatchObject({
          // same schedule density as in previous test, but window of 40 buckets ((60s refresh * 2) / 3s = 40)
          scheduleDensity: [
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            2,
            2,
            5,
            0,
            0,
            0,
            0,
            0,
            0,
            1,
            0,
            0,
            ...new Array(30).fill(0),
          ],
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
    const workloadAggregator = createWorkloadAggregator(taskManager, 10, 3000, logger);

    return new Promise((resolve, reject) => {
      workloadAggregator.pipe(take(2), bufferCount(2)).subscribe((results) => {
        expect(results[0].key).toEqual('workload');
        expect(results[0].value).toMatchObject({
          count: 5,
          taskTypes: {
            actions_telemetry: { count: 2, status: { idle: 2 } },
            alerting_telemetry: { count: 2, status: { idle: 2 } },
            session_cleanup: { count: 1, status: { idle: 1 } },
          },
        });
        expect(results[1].key).toEqual('workload');
        expect(results[1].value).toMatchObject({
          count: 5,
          taskTypes: {
            actions_telemetry: { count: 2, status: { idle: 2 } },
            alerting_telemetry: { count: 2, status: { idle: 1, failed: 1 } },
            session_cleanup: { count: 1, status: { idle: 1 } },
          },
        });
        resolve();
      }, reject);
    });
  });
});

describe('padBuckets', () => {
  test('returns zeroed out bucklets when there are no buckets in the histogram', async () => {
    expect(
      padBuckets(10, 3000, {
        key: '2020-10-02T19:47:28.128Z-2020-10-02T19:48:28.128Z',
        from: 1601668048128,
        from_as_string: '2020-10-02T19:47:28.128Z',
        to: 1601668108128,
        to_as_string: '2020-10-02T19:48:28.128Z',
        doc_count: 0,
        histogram: {
          buckets: [],
        },
      })
    ).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  test('pads buckets with zeros to fill out the entire period of time after detected buckets', async () => {
    expect(
      padBuckets(10, 3000, {
        key: '2020-10-02T19:47:28.128Z-2020-10-02T19:48:28.128Z',
        from: 1601668048128,
        from_as_string: '2020-10-02T19:47:28.128Z',
        to: 1601668077128,
        to_as_string: '2020-10-02T19:47:57.128Z',
        doc_count: 3,
        histogram: {
          buckets: [
            {
              key_as_string: '2020-10-02T19:47:27.000Z',
              key: 1601668047000,
              doc_count: 1,
            },
            {
              key_as_string: '2020-10-02T19:47:30.000Z',
              key: 1601668050000,
              doc_count: 1,
            },
            {
              key_as_string: '2020-10-02T19:47:33.000Z',
              key: 1601668053000,
              doc_count: 0,
            },
            {
              key_as_string: '2020-10-02T19:47:36.000Z',
              key: 1601668056000,
              doc_count: 0,
            },
            {
              key_as_string: '2020-10-02T19:47:39.000Z',
              key: 1601668059000,
              doc_count: 0,
            },
            {
              key_as_string: '2020-10-02T19:47:42.000Z',
              key: 1601668062000,
              doc_count: 1,
            },
          ],
        },
      })
    ).toEqual([1, 1, 0, 0, 0, 1, 0, 0, 0, 0]);
  });

  test('pads buckets with zeros to fill out the entire period of time before detected buckets', async () => {
    expect(
      padBuckets(10, 3000, {
        key: '2020-10-02T20:39:45.793Z-2020-10-02T20:40:14.793Z',
        from: 1.601671185793e12,
        from_as_string: '2020-10-02T20:39:45.793Z',
        to: 1.601671214793e12,
        to_as_string: '2020-10-02T20:40:14.793Z',
        doc_count: 2,
        histogram: {
          buckets: [
            {
              key_as_string: '2020-10-02T20:40:09.000Z',
              key: 1601671209000,
              doc_count: 1,
            },
            {
              key_as_string: '2020-10-02T20:40:12.000Z',
              key: 1601671212000,
              doc_count: 1,
            },
          ],
        },
      })
    ).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 1, 1]);
  });

  test('pads buckets with zeros to fill out the entire period surounding the detected buckets', async () => {
    expect(
      padBuckets(20, 3000, {
        key: '2020-10-02T20:39:45.793Z-2020-10-02T20:40:14.793Z',
        from: 1.601671185793e12,
        from_as_string: '2020-10-02T20:39:45.793Z',
        to: 1.1601671244793,
        to_as_string: '2020-10-02T20:40:44.793Z',
        doc_count: 2,
        histogram: {
          buckets: [
            {
              key_as_string: '2020-10-02T20:40:09.000Z',
              key: 1601671209000,
              doc_count: 1,
            },
            {
              key_as_string: '2020-10-02T20:40:12.000Z',
              key: 1601671212000,
              doc_count: 1,
            },
          ],
        },
      })
    ).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

function setTaskTypeCount(
  { aggregations }: MockESResult,
  taskType: string,
  status: Record<string, number>
) {
  const taskTypes = aggregations!.taskType as AggregationResultOf<
    WorkloadAggregation['aggs']['taskType'],
    {}
  >;
  const buckets = [
    ...taskTypes.buckets.filter(({ key }) => key !== taskType),
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
    count: buckets.reduce((sum, bucket) => sum + bucket.doc_count, 0),
    aggregations: {
      ...aggregations,
      taskType: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets,
      },
    },
  } as {}) as MockESResult;
}

/** *
 * This creates a mock histogram as returned by Elasticsearch
 *
 * @param from lower bound of query
 * @param findFrom the timestamp (key) of the first bucket returned
 * @param to upper bound of query
 * @param interval the duration that each bucket coresponds to
 * @param foundBuckets the buckets identified by ES, any buckets missing before or after which
 *           are still in the date range are assumed to have 0 results, ES only returns 0 for
 *           buckets that sit in between buckets which do have results
 */
function mockHistogram(
  from: number,
  findFrom: number,
  to: number,
  interval: number,
  foundBuckets: Array<number | undefined>
) {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  return {
    key: `${fromDate.toISOString()}-${toDate.toISOString()}`,
    from,
    from_as_string: fromDate.toISOString(),
    to,
    to_as_string: toDate.toISOString(),
    doc_count: foundBuckets.reduce((sum: number, count) => sum + (count ?? 0), 0),
    histogram: {
      buckets: foundBuckets.reduce(
        (histogramBuckets, count, index) => {
          if (typeof count === 'number') {
            const key = new Date(findFrom + index * interval);
            histogramBuckets.push({
              key_as_string: key.toISOString(),
              key: key.getTime(),
              doc_count: count,
            });
          }
          return histogramBuckets;
        },
        [] as Array<{
          key_as_string: string;
          key: number;
          doc_count: number;
        }>
      ),
    },
  };
}
