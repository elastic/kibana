/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { interval } from 'rxjs';
import { concatMap, map, catchError } from 'rxjs/operators';
import { Logger } from 'src/core/server';
import { JsonObject } from 'src/plugins/kibana_utils/common';
import { keyBy, mapValues } from 'lodash';
import { AggregatedStatProvider } from './runtime_statistics_aggregator';
import { TaskManager } from '../task_manager';
import {
  AggregationResult,
  AggregationBucketWithSubAgg,
  AggregationBucket,
} from '../queries/aggregation_clauses';
import { parseIntervalAsSecond } from '../lib/intervals';

export function createWorkloadAggregator(
  taskManager: TaskManager,
  refreshInterval: number,
  logger: Logger
): AggregatedStatProvider {
  return interval(refreshInterval).pipe(
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
        },
      })
    ),
    map(({ task }: AggregationResult<'task' | 'taskType' | 'schedule' | 'status'>) => {
      const {
        doc_count: sum = 0,
        taskType: { buckets: taskTypes = [] } = {},
        schedule: { buckets: schedules = [] } = {},
      } = task;
      const summary: JsonObject = {
        sum,
        taskTypes: mapValues(
          keyBy<AggregationBucketWithSubAgg<'status'>>(
            taskTypes as Array<AggregationBucketWithSubAgg<'status'>>,
            'key'
          ),
          ({ doc_count: docCount, status }) => ({
            sum: docCount,
            status: mapValues(keyBy<AggregationBucket>(status.buckets, 'key'), 'doc_count'),
          })
        ),
        schedule: (schedules as AggregationBucket[])
          .sort(
            ({ key: scheduleLeft }, { key: scheduleRight }) =>
              parseIntervalAsSecond(scheduleLeft) - parseIntervalAsSecond(scheduleRight)
          )
          .map(({ key: schedule, doc_count: count }) => [schedule, count]),
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
