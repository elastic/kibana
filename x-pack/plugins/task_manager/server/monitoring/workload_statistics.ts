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
import { AggregatedStatProvider } from './runtime_statistics_aggregator';
import { TaskManager } from '../task_manager';
import {
  AggregationSearchResult,
  AggregationBucketWithSubAgg,
  isBucketedAggregation,
  isAggregationBucket,
  isKeyedBuckets,
  isBucketsWithNumericKey,
  aggregationBucketsByKey,
  KeyedAggregationBucket,
  getStringKeyOfBucket,
  RangeAggregationBucket,
} from '../queries/aggregation_clauses';
import { parseIntervalAsSecond, asInterval } from '../lib/intervals';

interface StatusStat extends JsonObject {
  [status: string]: number;
}
interface TaskTypeStat extends JsonObject {
  [taskType: string]: {
    sum: number;
    status: StatusStat;
  };
}

export interface WorkloadStat extends JsonObject {
  sum: number;
  taskTypes: TaskTypeStat;
  schedule: Array<[string, number]>;
}

export function createWorkloadAggregator(
  taskManager: TaskManager,
  refreshInterval: number,
  pollInterval: number,
  logger: Logger
): AggregatedStatProvider<WorkloadStat> {
  // calculate scheduleDensity going two refreshIntervals or 1 minute into into the future
  // (the longer of the two)
  const scheduleDensityBuckets = Math.max(
    Math.round(60000 / pollInterval),
    Math.round((refreshInterval * 2) / pollInterval)
  );

  return timer(0, refreshInterval).pipe(
    concatMap(() =>
      taskManager.aggregate({
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
    map(
      ({
        aggregations,
        sum,
      }: AggregationSearchResult<
        | 'taskType'
        | 'schedule'
        | 'status'
        | 'scheduleDensity'
        | 'histogram'
        | 'overdue'
        | 'idleTasks'
      >) => {
        if (
          !isBucketedAggregation(aggregations.taskType) ||
          !isBucketedAggregation(aggregations.schedule) ||
          !(
            !isBucketedAggregation(aggregations.idleTasks) &&
            isAggregationBucket(aggregations.idleTasks.overdue) &&
            isBucketedAggregation(aggregations.idleTasks.scheduleDensity) &&
            !isKeyedBuckets(aggregations.idleTasks.scheduleDensity.buckets)
          )
        ) {
          throw new Error(`Invalid workload: ${JSON.stringify({ aggregations, sum })}`);
        }

        const {
          taskType: { buckets: taskTypes = [] } = {},
          schedule: { buckets: schedules = [] } = {},
          idleTasks: {
            overdue: { doc_count: overdue } = { doc_count: 0 },
            scheduleDensity: { buckets: [scheduleDensity] = [] } = {},
          } = {},
        } = aggregations;

        const summary: WorkloadStat = {
          sum,
          taskTypes: mapValues(
            keyBy<AggregationBucketWithSubAgg<'status'>>(
              taskTypes as Array<AggregationBucketWithSubAgg<'status'>>,
              'key'
            ),
            ({ doc_count: docCount, status }) => {
              return {
                sum: docCount,
                status: mapValues(aggregationBucketsByKey(status), 'doc_count'),
              };
            }
          ),
          schedule: (schedules as KeyedAggregationBucket[])
            .sort(
              (scheduleLeft, scheduleRight) =>
                parseIntervalAsSecond(getStringKeyOfBucket(scheduleLeft)) -
                parseIntervalAsSecond(getStringKeyOfBucket(scheduleRight))
            )
            .map((schedule) => [getStringKeyOfBucket(schedule), schedule.doc_count]),
          overdue,
          scheduleDensity: padBuckets(scheduleDensityBuckets, pollInterval, scheduleDensity),
        };
        return {
          key: 'workload',
          value: summary,
        };
      }
    ),
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
  scheduleDensity: unknown
): number[] {
  const { histogram, doc_count: docCount, from } = scheduleDensity as AggregationBucketWithSubAgg<
    'histogram',
    RangeAggregationBucket
  >;

  if (
    docCount &&
    histogram &&
    !isKeyedBuckets(histogram.buckets) &&
    isBucketsWithNumericKey(histogram.buckets)
  ) {
    const firstBucket = histogram.buckets[0].key;
    const bucketsToPadBeforeFirstBucket = bucketsBetween(from, firstBucket, pollInterval);
    const bucketsToPadAfterLast =
      scheduleDensityBuckets - (bucketsToPadBeforeFirstBucket + histogram.buckets.length);
    return [
      ...(bucketsToPadBeforeFirstBucket > 0
        ? new Array(bucketsToPadBeforeFirstBucket).fill(0)
        : []),
      ...histogram.buckets.map((bucket, index) => bucket.doc_count),
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
