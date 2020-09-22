/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { interval } from 'rxjs';
import { concatMap, map } from 'rxjs/operators';
import { JsonObject } from 'src/plugins/kibana_utils/common';
import { keyBy, mapValues } from 'lodash';
import { AggregatedStatProvider } from './runtime_statistics_aggregator';
import { TaskManager } from '../task_manager';
import {
  AggregationResult,
  AggregationBucketWithSubAgg,
  AggregationBucket,
} from '../queries/aggregation_clauses';

export function createWorkloadAggregator(
  taskManager: TaskManager,
  refreshInterval: number
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
        },
      })
    ),
    map(
      ({
        task: {
          doc_count: sum,
          taskType: { buckets: types },
        },
      }: AggregationResult<'task' | 'taskType' | 'status'>) => {
        const summary: JsonObject = {
          sum,
          types: mapValues(
            keyBy<AggregationBucketWithSubAgg<'status'>>(
              types as Array<AggregationBucketWithSubAgg<'status'>>,
              'key'
            ),
            ({ doc_count: docCount, status }) => ({
              sum: docCount,
              status: mapValues(keyBy<AggregationBucket>(status.buckets, 'key'), 'doc_count'),
            })
          ),
        };
        return {
          key: 'workload',
          value: summary,
        };
      }
    )
  );
}
