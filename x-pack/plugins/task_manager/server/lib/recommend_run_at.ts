/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keyBy } from 'lodash';
import type { TaskStore } from '../task_store';
import { parseIntervalAsSecond, asInterval } from './intervals';

export interface Opts {
  interval: string;
  taskStore: TaskStore;
}

const LOOK_BACK = '5m';
const BUCKET_INTERVAL = '10s';
const BUCKET_INTERVAL_S = parseIntervalAsSecond(BUCKET_INTERVAL);
const MAX_LOOK_AHEAD_MS = 5 * 60 * 1000;

export async function recommendRunAt({ interval, taskStore }: Opts): Promise<Date> {
  const lookAhead = asInterval(Math.min(parseIntervalAsSecond(interval) * 1000, MAX_LOOK_AHEAD_MS));

  const result = await taskStore.aggregate({
    aggs: {
      task_density: {
        date_histogram: {
          field: 'task.runAt',
          fixed_interval: BUCKET_INTERVAL,
          extended_bounds: {
            min: 'now',
            max: `now+${lookAhead}`,
          },
        },
        aggs: {
          task_intervals: {
            terms: {
              field: 'task.schedule.interval',
            },
          },
        },
      },
    },
    query: {
      bool: {
        filter: {
          bool: {
            must: [
              {
                range: {
                  'task.runAt': {
                    gte: `now-${LOOK_BACK}`,
                    lte: `now+${lookAhead}`,
                  },
                },
              },
              {
                exists: {
                  field: 'task.schedule.interval',
                },
              },
            ],
          },
        },
      },
    },
  });
  const taskDensity = (
    result.aggregations?.task_density! as unknown as {
      buckets: Array<{
        key_as_string: string;
        key: number;
        doc_count: number;
        task_intervals: {
          key: string;
          doc_count: number;
          buckets: Array<{
            key: string;
            doc_count: number;
          }>;
        };
      }>;
    }
  ).buckets;

  if (taskDensity.length === 0) {
    return new Date();
  }

  // Add future task runs
  const taskDensityByKey = keyBy(taskDensity, 'key');
  for (const item of taskDensity) {
    for (const taskInterval of item.task_intervals.buckets || []) {
      let multiple = 1;
      const bucketOffsetMs =
        Math.ceil(parseIntervalAsSecond(taskInterval.key) / BUCKET_INTERVAL_S) *
        BUCKET_INTERVAL_S *
        1000;
      while (taskDensityByKey[item.key + bucketOffsetMs * multiple]) {
        taskDensityByKey[item.key + bucketOffsetMs * multiple].doc_count += taskInterval.doc_count;
        multiple++;
      }
    }
  }

  const sortedBuckets = taskDensity
    .filter((a) => a.key > Date.now())
    .sort((a, b) => {
      if (a.doc_count === b.doc_count) {
        return a.key - b.key;
      }
      return a.doc_count - b.doc_count;
    });

  return new Date(sortedBuckets[0].key);
}
