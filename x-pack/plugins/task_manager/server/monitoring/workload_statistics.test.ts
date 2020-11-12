/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first, take, bufferCount } from 'rxjs/operators';
import { loggingSystemMock } from '../../../../../src/core/server/mocks';
import {
  WorkloadAggregation,
  createWorkloadAggregator,
  padBuckets,
  estimateRecurringTaskScheduling,
} from './workload_statistics';
import { ConcreteTaskInstance } from '../task';
import { AggregationResultOf, ESSearchResponse } from '../../../../typings/elasticsearch';
import { times } from 'lodash';
import { taskStoreMock } from '../task_store.mock';
import { of, Subject } from 'rxjs';
import { sleep } from '../test_utils';

type MockESResult = ESSearchResponse<
  ConcreteTaskInstance,
  {
    body: WorkloadAggregation;
  }
>;

describe('Workload Statistics Aggregator', () => {
  test('queries the Task Store at a fixed interval for the current workload', async () => {
    const taskStore = taskStoreMock.create({});
    taskStore.aggregate.mockResolvedValue({
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

    const workloadAggregator = createWorkloadAggregator(
      taskStore,
      of(true),
      10,
      3000,
      loggingSystemMock.create().get()
    );

    return new Promise((resolve) => {
      workloadAggregator.pipe(first()).subscribe(() => {
        expect(taskStore.aggregate).toHaveBeenCalledWith({
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
                      aggs: {
                        interval: {
                          terms: {
                            field: 'task.schedule.interval',
                          },
                        },
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

  const mockAggregatedResult: () => MockESResult = () =>
    ({
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
              mockHistogram(0, 7 * 3000 + 500, 60 * 1000, 3000, [2, 2, 5, 0, 0, 0, 0, 0, 0, 1]),
            ],
          },
        },
      },
    } as MockESResult);

  test('returns a summary of the workload by task type', async () => {
    const taskStore = taskStoreMock.create({});
    taskStore.aggregate.mockResolvedValue(mockAggregatedResult());

    const workloadAggregator = createWorkloadAggregator(
      taskStore,
      of(true),
      10,
      3000,
      loggingSystemMock.create().get()
    );

    return new Promise((resolve) => {
      workloadAggregator.pipe(first()).subscribe((result) => {
        expect(result.key).toEqual('workload');
        expect(result.value).toMatchObject({
          count: 4,
          task_types: {
            actions_telemetry: { count: 2, status: { idle: 2 } },
            alerting_telemetry: { count: 1, status: { idle: 1 } },
            session_cleanup: { count: 1, status: { idle: 1 } },
          },
        });
        resolve();
      });
    });
  });

  test('skips summary of the workload when services are unavailable', async () => {
    const taskStore = taskStoreMock.create({});
    taskStore.aggregate.mockResolvedValue(mockAggregatedResult());

    const availability$ = new Subject<boolean>();

    const workloadAggregator = createWorkloadAggregator(
      taskStore,
      availability$,
      10,
      3000,
      loggingSystemMock.create().get()
    );

    return new Promise(async (resolve) => {
      workloadAggregator.pipe(first()).subscribe((result) => {
        expect(result.key).toEqual('workload');
        expect(result.value).toMatchObject({
          count: 4,
          task_types: {
            actions_telemetry: { count: 2, status: { idle: 2 } },
            alerting_telemetry: { count: 1, status: { idle: 1 } },
            session_cleanup: { count: 1, status: { idle: 1 } },
          },
        });
        resolve();
      });

      availability$.next(false);

      await sleep(10);
      expect(taskStore.aggregate).not.toHaveBeenCalled();
      await sleep(10);
      expect(taskStore.aggregate).not.toHaveBeenCalled();
      availability$.next(true);
    });
  });

  test('returns a count of the overdue workload', async () => {
    const taskStore = taskStoreMock.create({});
    taskStore.aggregate.mockResolvedValue(mockAggregatedResult());

    const workloadAggregator = createWorkloadAggregator(
      taskStore,
      of(true),
      10,
      3000,
      loggingSystemMock.create().get()
    );

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
    const taskStore = taskStoreMock.create({});
    taskStore.aggregate.mockResolvedValue(mockAggregatedResult());

    const workloadAggregator = createWorkloadAggregator(
      taskStore,
      of(true),
      10,
      3000,
      loggingSystemMock.create().get()
    );

    return new Promise((resolve) => {
      workloadAggregator.pipe(first()).subscribe((result) => {
        expect(result.key).toEqual('workload');
        expect(result.value).toMatchObject({
          // we have intervals every 3s, so we aggregate buckets 3s apart
          // in this mock, Elasticsearch found tasks scheduled in 21 (8th bucket), 24, 27 and 48s seconds from now
          //  0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57
          // [0, 0, 0, 0,  0,  0,  0,  2,  2,  5,  0,  0,  0,  0,  0,  0,  1,  0,  0, 0 ]
          //  Above you see each bucket and the number of scheduled tasks we expect to have in them
          estimated_schedule_density: [0, 0, 0, 0, 0, 0, 0, 2, 2, 5, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        });
        resolve();
      });
    });
  });

  test('returns a histogram of the upcoming workload for twice refresh rate when rate is low', async () => {
    const taskStore = taskStoreMock.create({});
    taskStore.aggregate.mockResolvedValue(mockAggregatedResult());

    const workloadAggregator = createWorkloadAggregator(
      taskStore,
      of(true),
      60 * 1000,
      3000,
      loggingSystemMock.create().get()
    );

    return new Promise((resolve) => {
      workloadAggregator.pipe(first()).subscribe(() => {
        expect(taskStore.aggregate.mock.calls[0][0]).toMatchObject({
          aggs: {
            idleTasks: {
              aggs: {
                scheduleDensity: {
                  range: {
                    field: 'task.runAt',
                    ranges: [
                      {
                        from: 'now',
                        to: 'now+2m',
                      },
                    ],
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

  test('returns a histogram of the upcoming workload maxed out at 50 buckets when rate is too low', async () => {
    const taskStore = taskStoreMock.create({});
    taskStore.aggregate.mockResolvedValue(mockAggregatedResult());

    const workloadAggregator = createWorkloadAggregator(
      taskStore,
      of(true),
      15 * 60 * 1000,
      3000,
      loggingSystemMock.create().get()
    );

    return new Promise((resolve) => {
      workloadAggregator.pipe(first()).subscribe((result) => {
        expect(taskStore.aggregate.mock.calls[0][0]).toMatchObject({
          aggs: {
            idleTasks: {
              aggs: {
                scheduleDensity: {
                  range: {
                    field: 'task.runAt',
                    ranges: [
                      {
                        from: 'now',
                        // 50 buckets of 3s = 50 * 3 = 150s
                        to: 'now+150s',
                      },
                    ],
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

  test('recovers from errors fetching the workload', async () => {
    const taskStore = taskStoreMock.create({});
    taskStore.aggregate
      .mockResolvedValueOnce(
        setTaskTypeCount(mockAggregatedResult(), 'alerting_telemetry', {
          idle: 2,
        })
      )
      .mockRejectedValueOnce(new Error('Elasticsearch has gone poof'))
      .mockResolvedValueOnce(
        setTaskTypeCount(mockAggregatedResult(), 'alerting_telemetry', {
          idle: 1,
          failed: 1,
        })
      );
    const logger = loggingSystemMock.create().get();
    const workloadAggregator = createWorkloadAggregator(taskStore, of(true), 10, 3000, logger);

    return new Promise((resolve, reject) => {
      workloadAggregator.pipe(take(2), bufferCount(2)).subscribe((results) => {
        expect(results[0].key).toEqual('workload');
        expect(results[0].value).toMatchObject({
          count: 5,
          task_types: {
            actions_telemetry: { count: 2, status: { idle: 2 } },
            alerting_telemetry: { count: 2, status: { idle: 2 } },
            session_cleanup: { count: 1, status: { idle: 1 } },
          },
        });
        expect(results[1].key).toEqual('workload');
        expect(results[1].value).toMatchObject({
          count: 5,
          task_types: {
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

describe('estimateRecurringTaskScheduling', () => {
  test('flattens out buckets with non recurring tasks', () => {
    const now = Date.now();
    const schedule = times(10, (index) => ({
      key: index * 3000 + now,
      nonRecurring: index,
    }));
    expect(estimateRecurringTaskScheduling(schedule, 3000)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  test('estimates the buckets that recurring tasks might repeat in when recurring task interval equals the interval', () => {
    const now = Date.now();
    const schedule: Array<{
      key: number;
      nonRecurring: number;
      recurring?: Array<[number, string]>;
    }> = times(10, (index) => ({
      key: index * 3000 + now,
      nonRecurring: 0,
    }));

    schedule[0].nonRecurring = 1;
    schedule[1].nonRecurring = 1;
    schedule[4].recurring = [[1, '3s']];

    expect(estimateRecurringTaskScheduling(schedule, 3000)).toEqual([1, 1, 0, 0, 1, 1, 1, 1, 1, 1]);
  });

  test('estimates the buckets that recurring tasks might repeat in when recurring task interval is larger than the interval', () => {
    const now = Date.now();
    const schedule: Array<{
      key: number;
      nonRecurring: number;
      recurring?: Array<[number, string]>;
    }> = times(10, (index) => ({
      key: index * 3000 + now,
      nonRecurring: 0,
    }));

    schedule[0].nonRecurring = 1;
    schedule[1].nonRecurring = 1;
    schedule[4].recurring = [[1, '6s']];

    expect(estimateRecurringTaskScheduling(schedule, 3000)).toEqual([1, 1, 0, 0, 1, 0, 1, 0, 1, 0]);
  });

  test('estimates the buckets that recurring tasks might repeat in when recurring task interval doesnt divide by interval', () => {
    const now = Date.now();
    const schedule: Array<{
      key: number;
      nonRecurring: number;
      recurring?: Array<[number, string]>;
    }> = times(10, (index) => ({
      key: index * 3000 + now,
      nonRecurring: 0,
    }));

    schedule[0].nonRecurring = 1;
    schedule[1].nonRecurring = 1;
    schedule[4].recurring = [[1, '5s']];

    expect(estimateRecurringTaskScheduling(schedule, 3000)).toEqual([1, 1, 0, 0, 1, 0, 1, 0, 1, 0]);
  });

  test('estimates the buckets that recurring tasks might repeat in when recurring tasks overlap', () => {
    const now = Date.now();
    const schedule: Array<{
      key: number;
      nonRecurring: number;
      recurring?: Array<[number, string]>;
    }> = times(20, (index) => ({
      key: index * 3000 + now,
      nonRecurring: 0,
    }));

    schedule[0].nonRecurring = 1;
    schedule[1].nonRecurring = 1;
    schedule[3].recurring = [[1, '3s']];
    schedule[4].recurring = [
      [2, '6s'],
      [1, '8s'],
    ];
    schedule[5].recurring = [[1, '5s']];
    schedule[6].nonRecurring = 3;

    expect(estimateRecurringTaskScheduling(schedule, 3000)).toEqual([
      1,
      1,
      0,
      1,
      4,
      2,
      6,
      3,
      3,
      2,
      4,
      2,
      3,
      3,
      3,
      2,
      4,
      2,
      3,
      3,
    ]);
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
        from: 1601668046000,
        from_as_string: '2020-10-02T19:47:26.000Z',
        to: 1601668076000,
        to_as_string: '2020-10-02T19:47:56.000Z',
        doc_count: 3,
        histogram: {
          buckets: [
            {
              key_as_string: '2020-10-02T19:47:27.000Z',
              key: 1601668047000,
              doc_count: 1,
              interval: {
                sum_other_doc_count: 0,
                buckets: [],
              },
            },
            {
              key_as_string: '2020-10-02T19:47:30.000Z',
              key: 1601668050000,
              doc_count: 1,
              interval: {
                sum_other_doc_count: 0,
                buckets: [],
              },
            },
            {
              key_as_string: '2020-10-02T19:47:33.000Z',
              key: 1601668053000,
              doc_count: 0,
              interval: {
                sum_other_doc_count: 0,
                buckets: [],
              },
            },
            {
              key_as_string: '2020-10-02T19:47:36.000Z',
              key: 1601668056000,
              doc_count: 0,
              interval: {
                sum_other_doc_count: 0,
                buckets: [],
              },
            },
            {
              key_as_string: '2020-10-02T19:47:39.000Z',
              key: 1601668059000,
              doc_count: 0,
              interval: {
                sum_other_doc_count: 0,
                buckets: [],
              },
            },
            {
              key_as_string: '2020-10-02T19:47:42.000Z',
              key: 1601668062000,
              doc_count: 1,
              interval: {
                sum_other_doc_count: 0,
                buckets: [],
              },
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
        from: 1601671183000,
        from_as_string: '2020-10-02T20:39:43.000Z',
        to: 1601671213000,
        to_as_string: '2020-10-02T20:40:13.000Z',
        doc_count: 2,
        histogram: {
          buckets: [
            {
              key_as_string: '2020-10-02T20:40:09.000Z',
              key: 1601671209000,
              doc_count: 1,
              interval: { buckets: [] },
            },
            {
              key_as_string: '2020-10-02T20:40:12.000Z',
              key: 1601671212000,
              doc_count: 1,
              interval: { buckets: [] },
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
        from: 1601671185793,
        from_as_string: '2020-10-02T20:39:45.793Z',
        to: 1601671245793,
        to_as_string: '2020-10-02T20:40:45.793Z',
        doc_count: 2,
        histogram: {
          buckets: [
            {
              key_as_string: '2020-10-02T20:40:09.000Z',
              key: 1601671209000,
              doc_count: 1,
              interval: { buckets: [] },
            },
            {
              key_as_string: '2020-10-02T20:40:12.000Z',
              key: 1601671212000,
              doc_count: 1,
              interval: { buckets: [] },
            },
          ],
        },
      })
    ).toEqual([0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
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
        sum_other_doc_count: 0,
        buckets: Object.entries(status).map(([key, count]) => ({
          key,
          doc_count: count,
        })),
      },
    },
  ];
  return ({
    hits: {
      total: { value: buckets.reduce((sum, bucket) => sum + bucket.doc_count, 0) },
    },
    aggregations: {
      ...aggregations,
      taskType: {
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
  const now = Date.now();
  const fromDate = new Date(now + from);
  const toDate = new Date(now + to);
  return {
    key: `${fromDate.toISOString()}-${toDate.toISOString()}`,
    from: now + from,
    from_as_string: fromDate.toISOString(),
    to: now + to,
    to_as_string: toDate.toISOString(),
    doc_count: foundBuckets.reduce((sum: number, count) => sum + (count ?? 0), 0),
    histogram: {
      buckets: foundBuckets.reduce(
        (histogramBuckets, count, index) => {
          if (typeof count === 'number') {
            const key = new Date(now + findFrom + index * interval);
            histogramBuckets.push({
              key_as_string: key.toISOString(),
              key: key.getTime(),
              doc_count: count,
              interval: { buckets: [] },
            });
          }
          return histogramBuckets;
        },
        [] as Array<{
          key_as_string: string;
          key: number;
          doc_count: number;
          interval: {
            buckets: Array<{
              key: string;
              doc_count: number;
            }>;
          };
        }>
      ),
    },
  };
}
