/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineLatest, Observable, timer } from 'rxjs';
import { mergeMap, map, filter, switchMap, catchError } from 'rxjs/operators';
import { Logger } from 'src/core/server';
import { JsonObject } from 'src/plugins/kibana_utils/common';
import { keyBy, mapValues } from 'lodash';
import { estypes } from '@elastic/elasticsearch';
import { AggregatedStatProvider } from './runtime_statistics_aggregator';
import { parseIntervalAsSecond, asInterval, parseIntervalAsMillisecond } from '../lib/intervals';
import { AggregationResultOf } from '../../../../../typings/elasticsearch';
import { HealthStatus } from './monitoring_stats_stream';
import { TaskStore } from '../task_store';

interface StatusStat extends JsonObject {
  [status: string]: number;
}
interface TaskTypeStat extends JsonObject {
  [taskType: string]: {
    count: number;
    status: StatusStat;
  };
}

export interface WorkloadStat extends JsonObject {
  count: number;
  task_types: TaskTypeStat;
  schedule: Array<[string, number]>;
  overdue: number;
  estimated_schedule_density: number[];
}

export interface WorkloadAggregation {
  aggs: {
    taskType: {
      terms: { field: string };
      aggs: {
        status: {
          terms: { field: string };
        };
      };
    };
    schedule: {
      terms: { field: string };
    };
    idleTasks: {
      filter: {
        term: { 'task.status': string };
      };
      aggs: {
        scheduleDensity: {
          range: {
            field: string;
            ranges: [{ from: string; to: string }];
          };
          aggs: {
            histogram: {
              date_histogram: {
                field: string;
                fixed_interval: string;
              };
              aggs: {
                interval: {
                  terms: { field: string };
                };
              };
            };
          };
        };
        overdue: {
          filter: {
            range: {
              'task.runAt': { lt: string };
            };
          };
        };
      };
    };
  };
}

// The type of a bucket in the scheduleDensity range aggregation
type ScheduleDensityResult = AggregationResultOf<
  // @ts-expect-error AggregationRange reqires from: number
  WorkloadAggregation['aggs']['idleTasks']['aggs']['scheduleDensity'],
  {}
>['buckets'][0];
// @ts-expect-error cannot infer histogram
type ScheduledIntervals = ScheduleDensityResult['histogram']['buckets'][0];

// Set an upper bound just in case a customer sets a really high refresh rate
const MAX_SHCEDULE_DENSITY_BUCKETS = 50;

export function createWorkloadAggregator(
  taskStore: TaskStore,
  elasticsearchAndSOAvailability$: Observable<boolean>,
  refreshInterval: number,
  pollInterval: number,
  logger: Logger
): AggregatedStatProvider<WorkloadStat> {
  // calculate scheduleDensity going two refreshIntervals or 1 minute into into the future
  // (the longer of the two)
  const scheduleDensityBuckets = Math.min(
    Math.max(Math.round(60000 / pollInterval), Math.round((refreshInterval * 2) / pollInterval)),
    MAX_SHCEDULE_DENSITY_BUCKETS
  );

  return combineLatest([timer(0, refreshInterval), elasticsearchAndSOAvailability$]).pipe(
    filter(([, areElasticsearchAndSOAvailable]) => areElasticsearchAndSOAvailable),
    mergeMap(() =>
      taskStore.aggregate({
        aggs: {
          taskType: {
            terms: { size: 100, field: 'task.taskType' },
            aggs: {
              status: {
                terms: { field: 'task.status' },
              },
            },
          },
          schedule: {
            terms: { field: 'task.schedule.interval' },
          },
          idleTasks: {
            filter: {
              term: { 'task.status': 'idle' },
            },
            aggs: {
              scheduleDensity: {
                // create a window of upcoming tasks
                range: {
                  field: 'task.runAt',
                  ranges: [
                    {
                      // @ts-expect-error @elastic/elasticsearch The `AggregationRange` type only supports `double` for `from` and `to` but it can be a string too for time based ranges
                      from: `now`,
                      // @ts-expect-error @elastic/elasticsearch The `AggregationRange` type only supports `double` for `from` and `to` but it can be a string too for time based ranges
                      to: `now+${asInterval(scheduleDensityBuckets * pollInterval)}`,
                    },
                  ],
                },
                aggs: {
                  // create histogram of scheduling in the window, with each bucket being a polling interval
                  histogram: {
                    date_histogram: {
                      field: 'task.runAt',
                      fixed_interval: asInterval(pollInterval),
                    },
                    // break down each bucket in the historgram by schedule
                    aggs: {
                      interval: {
                        terms: { field: 'task.schedule.interval' },
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
      })
    ),
    map((result) => {
      const {
        aggregations,
        hits: { total },
      } = result;
      const count = typeof total === 'number' ? total : total.value;

      if (!hasAggregations(aggregations)) {
        throw new Error(`Invalid workload: ${JSON.stringify(result)}`);
      }

      const taskTypes = aggregations.taskType.buckets;
      const schedules = aggregations.schedule.buckets;

      const {
        overdue: { doc_count: overdue },
        scheduleDensity: { buckets: [scheduleDensity] = [] } = {},
      } = aggregations.idleTasks;

      const summary: WorkloadStat = {
        count,
        task_types: mapValues(keyBy(taskTypes, 'key'), ({ doc_count: docCount, status }) => {
          return {
            count: docCount,
            status: mapValues(keyBy(status.buckets, 'key'), 'doc_count'),
          };
        }),
        schedule: schedules
          .sort(
            (scheduleLeft, scheduleRight) =>
              parseIntervalAsSecond(scheduleLeft.key as string) -
              parseIntervalAsSecond(scheduleRight.key as string)
          )
          .map((schedule) => [schedule.key as string, schedule.doc_count]),
        overdue,
        estimated_schedule_density: padBuckets(
          scheduleDensityBuckets,
          pollInterval,
          scheduleDensity
        ),
      };
      return {
        key: 'workload',
        value: summary,
      };
    }),
    catchError((ex: Error, caught) => {
      logger.error(`[WorkloadAggregator]: ${ex}`);
      // continue to pull values from the same observable but only on the next refreshInterval
      return timer(refreshInterval).pipe(switchMap(() => caught));
    })
  );
}

interface IntervalTaskCountTouple {
  nonRecurring?: number;
  recurring?: Array<[number, string]>;
  key: number;
}

export function padBuckets(
  scheduleDensityBuckets: number,
  pollInterval: number,
  scheduleDensity: ScheduleDensityResult
): number[] {
  // @ts-expect-error cannot infer histogram
  if (scheduleDensity.from && scheduleDensity.to && scheduleDensity.histogram?.buckets?.length) {
    // @ts-expect-error cannot infer histogram
    const { histogram, from, to } = scheduleDensity;
    const firstBucket = histogram.buckets[0].key;
    const lastBucket = histogram.buckets[histogram.buckets.length - 1].key;

    // detect when the first bucket is before the `from` so that we can take that into
    // account by begining the timeline earlier
    // This can happen when you have overdue tasks and Elasticsearch returns their bucket
    // as begining before the `from`
    const firstBucketStartsInThePast = firstBucket - from < 0;

    const bucketsToPadBeforeFirstBucket = firstBucketStartsInThePast
      ? []
      : calculateBucketsBetween(firstBucket, from, pollInterval);

    const bucketsToPadAfterLast = calculateBucketsBetween(
      lastBucket + pollInterval,
      firstBucketStartsInThePast ? to - pollInterval : to,
      pollInterval
    );

    return estimateRecurringTaskScheduling(
      [
        ...bucketsToPadBeforeFirstBucket,
        ...histogram.buckets.map(countByIntervalInBucket),
        ...bucketsToPadAfterLast,
      ],
      pollInterval
    );
  }
  return new Array(scheduleDensityBuckets).fill(0);
}

function countByIntervalInBucket(bucket: ScheduledIntervals): IntervalTaskCountTouple {
  if (bucket.doc_count === 0) {
    return { nonRecurring: 0, key: bucket.key };
  }
  const recurring: Array<[number, string]> = [];
  let nonRecurring = bucket.doc_count;
  for (const intervalBucket of bucket.interval.buckets) {
    recurring.push([intervalBucket.doc_count, intervalBucket.key as string]);
    nonRecurring -= intervalBucket.doc_count;
  }

  return { nonRecurring, recurring, key: bucket.key };
}

function calculateBucketsBetween(
  from: number,
  to: number,
  interval: number,
  bucketInterval: number = interval
): Array<{ key: number }> {
  const calcForwardInTime = from < to;

  // as task interval might not divide by the pollInterval (aka the bucket interval)
  // we have to adjust for the "drift" that occurs when estimating when the next
  // bucket the task might actually get scheduled in
  const actualInterval = Math.ceil(interval / bucketInterval) * bucketInterval;

  const buckets: Array<{ key: number }> = [];
  const toBound = calcForwardInTime ? to : -(to + actualInterval);
  let fromBound = calcForwardInTime ? from : -from;

  while (fromBound < toBound) {
    buckets.push({ key: fromBound });
    fromBound += actualInterval;
  }

  return calcForwardInTime
    ? buckets
    : buckets.reverse().map((bucket) => {
        bucket.key = Math.abs(bucket.key);
        return bucket;
      });
}

export function estimateRecurringTaskScheduling(
  scheduleDensity: IntervalTaskCountTouple[],
  pollInterval: number
) {
  const lastKey = scheduleDensity[scheduleDensity.length - 1].key;

  return scheduleDensity.map((bucket, currentBucketIndex) => {
    for (const [count, interval] of bucket.recurring ?? []) {
      for (const recurrance of calculateBucketsBetween(
        bucket.key,
        // `calculateBucketsBetween` uses the `to` as a non-inclusive upper bound
        // but lastKey is a bucket we wish to include
        lastKey + pollInterval,
        parseIntervalAsMillisecond(interval),
        pollInterval
      )) {
        const recurranceBucketIndex =
          currentBucketIndex + Math.ceil((recurrance.key - bucket.key) / pollInterval);

        if (recurranceBucketIndex < scheduleDensity.length) {
          scheduleDensity[recurranceBucketIndex].nonRecurring =
            count + (scheduleDensity[recurranceBucketIndex].nonRecurring ?? 0);
        }
      }
    }
    return bucket.nonRecurring ?? 0;
  });
}

export function summarizeWorkloadStat(
  workloadStats: WorkloadStat
): { value: WorkloadStat; status: HealthStatus } {
  return {
    value: workloadStats,
    status: HealthStatus.OK,
  };
}

function hasAggregations(
  aggregations?: Record<string, estypes.Aggregate>
): aggregations is WorkloadAggregationResponse {
  return !!(
    aggregations?.taskType &&
    aggregations?.schedule &&
    (aggregations?.idleTasks as IdleTasksAggregation)?.overdue &&
    (aggregations?.idleTasks as IdleTasksAggregation)?.scheduleDensity
  );
}
export interface WorkloadAggregationResponse {
  taskType: TaskTypeAggregation;
  schedule: ScheduleAggregation;
  idleTasks: IdleTasksAggregation;
  [otherAggs: string]: estypes.Aggregate;
}
export interface TaskTypeAggregation extends estypes.FiltersAggregate {
  buckets: Array<{
    doc_count: number;
    key: string | number;
    status: {
      buckets: Array<{
        doc_count: number;
        key: string | number;
      }>;
      doc_count_error_upper_bound?: number | undefined;
      sum_other_doc_count?: number | undefined;
    };
  }>;
  doc_count_error_upper_bound?: number | undefined;
  sum_other_doc_count?: number | undefined;
}
export interface ScheduleAggregation extends estypes.FiltersAggregate {
  buckets: Array<{
    doc_count: number;
    key: string | number;
  }>;
  doc_count_error_upper_bound?: number | undefined;
  sum_other_doc_count?: number | undefined;
}

export type ScheduleDensityHistogram = DateRangeBucket & {
  histogram: {
    buckets: Array<
      DateHistogramBucket & {
        interval: {
          buckets: Array<{
            doc_count: number;
            key: string | number;
          }>;
          doc_count_error_upper_bound?: number | undefined;
          sum_other_doc_count?: number | undefined;
        };
      }
    >;
  };
};
export interface IdleTasksAggregation extends estypes.FiltersAggregate {
  doc_count: number;
  scheduleDensity: {
    buckets: ScheduleDensityHistogram[];
  };
  overdue: {
    doc_count: number;
  };
}

interface DateHistogramBucket {
  doc_count: number;
  key: number;
  key_as_string: string;
}
interface DateRangeBucket {
  key: string;
  to?: number;
  from?: number;
  to_as_string?: string;
  from_as_string?: string;
  doc_count: number;
}
