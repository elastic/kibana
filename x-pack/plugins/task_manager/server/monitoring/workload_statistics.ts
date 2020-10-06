/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { timer } from 'rxjs';
import { concatMap, map, catchError } from 'rxjs/operators';
import { Logger } from 'src/core/server';
import { JsonObject } from 'src/plugins/kibana_utils/common';
import { keyBy, mapValues } from 'lodash';
import { ESSearchResponse } from '../../../apm/typings/elasticsearch';
import { AggregatedStatProvider } from './runtime_statistics_aggregator';
import { TaskManager } from '../task_manager';
import { ConcreteTaskInstance } from '../task';
import { parseIntervalAsSecond, asInterval } from '../lib/intervals';
import { AggregationResultOf } from '../../../apm/typings/elasticsearch/aggregations';
import { HealthStatus } from './monitoring_stats_stream';

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
  taskTypes: TaskTypeStat;
  schedule: Array<[string, number]>;
  overdue: number;
  scheduleDensity: number[];
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
  WorkloadAggregation['aggs']['idleTasks']['aggs']['scheduleDensity'],
  {}
>['buckets'][0];

// Set an upper bound just in case a customer sets a really high refresh rate
const MAX_SHCEDULE_DENSITY_BUCKETS = 50;

export function createWorkloadAggregator(
  taskManager: TaskManager,
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

  return timer(0, refreshInterval).pipe(
    concatMap(() =>
      taskManager.aggregate<WorkloadAggregation>({
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
            terms: { field: 'task.schedule.interval' },
          },
          idleTasks: {
            filter: {
              term: { 'task.status': 'idle' },
            },
            aggs: {
              scheduleDensity: {
                range: {
                  field: 'task.runAt',
                  ranges: [
                    { from: `now`, to: `now+${asInterval(scheduleDensityBuckets * pollInterval)}` },
                  ],
                },
                aggs: {
                  histogram: {
                    date_histogram: {
                      field: 'task.runAt',
                      fixed_interval: asInterval(pollInterval),
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
    map((result: ESSearchResponse<ConcreteTaskInstance, { body: WorkloadAggregation }>) => {
      const {
        aggregations,
        hits: {
          total: { value: count },
        },
      } = result;

      if (
        !(
          aggregations?.taskType &&
          aggregations?.schedule &&
          aggregations?.idleTasks?.overdue &&
          aggregations?.idleTasks?.scheduleDensity
        )
      ) {
        throw new Error(`Invalid workload: ${JSON.stringify(result)}`);
      }

      const taskTypes = (aggregations.taskType as AggregationResultOf<
        WorkloadAggregation['aggs']['taskType'],
        {}
      >).buckets;
      const schedules = (aggregations.schedule as AggregationResultOf<
        WorkloadAggregation['aggs']['schedule'],
        {}
      >).buckets;

      const {
        overdue: { doc_count: overdue },
        scheduleDensity: { buckets: [scheduleDensity] = [] } = {},
      } = aggregations.idleTasks as AggregationResultOf<
        WorkloadAggregation['aggs']['idleTasks'],
        {}
      >;

      const summary: WorkloadStat = {
        count,
        taskTypes: mapValues(keyBy(taskTypes, 'key'), ({ doc_count: docCount, status }) => {
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
        scheduleDensity: padBuckets(scheduleDensityBuckets, pollInterval, scheduleDensity),
      };
      return {
        key: 'workload',
        value: summary,
      };
    }),
    catchError((ex: Error, caught) => {
      logger.error(`[WorkloadAggregator]: ${ex}`);
      // continue to pull values from the same observable
      return caught;
    })
  );
}

export function padBuckets(
  scheduleDensityBuckets: number,
  pollInterval: number,
  scheduleDensity: ScheduleDensityResult
): number[] {
  if (scheduleDensity.from && scheduleDensity.histogram?.buckets?.length) {
    const { histogram, from } = scheduleDensity;
    const firstBucket = histogram.buckets[0].key;
    const bucketsToPadBeforeFirstBucket = bucketsBetween(from, firstBucket, pollInterval);
    const bucketsToPadAfterLast =
      scheduleDensityBuckets - (bucketsToPadBeforeFirstBucket + histogram.buckets.length);
    return [
      ...(bucketsToPadBeforeFirstBucket > 0
        ? new Array(bucketsToPadBeforeFirstBucket).fill(0)
        : []),
      ...histogram.buckets.map((bucket) => bucket.doc_count),
      ...(bucketsToPadAfterLast > 0 ? new Array(bucketsToPadAfterLast).fill(0) : []),
    ];
  }
  return new Array(scheduleDensityBuckets).fill(0);
}

function bucketsBetween(from: number, to: number, interval: number) {
  let fromBound = from;
  let count = 0;
  while (fromBound <= to) {
    fromBound += interval;
    count++;
  }
  return count;
}

export function summarizeWorkloadStat(
  workloadStats: WorkloadStat
): { value: WorkloadStat; status: HealthStatus } {
  return {
    value: workloadStats,
    status: HealthStatus.OK,
  };
}
