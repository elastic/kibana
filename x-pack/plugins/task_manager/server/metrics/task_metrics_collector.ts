/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import {
  AggregationsStringTermsBucket,
  AggregationsStringTermsBucketKeys,
  AggregationsTermsAggregateBase,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Observable, Subject } from 'rxjs';
import { TaskStore } from '../task_store';
import {
  IdleTaskWithExpiredRunAt,
  RunningOrClaimingTaskWithExpiredRetryAt,
  OneOfTaskTypes,
} from '../queries/mark_available_tasks_as_claimed';
import { ITaskEventEmitter, TaskLifecycleEvent } from '../polling_lifecycle';
import { asTaskManagerMetricEvent } from '../task_events';
import { asOk } from '../lib/result_type';

const DEFAULT_POLL_INTERVAL = 5000; // query every 5 seconds
interface ConstructorOpts {
  logger: Logger;
  store: TaskStore;
  pollInterval?: number;
  taskTypes: Set<string>;
  excludedTypes: Set<string>;
}

export interface TaskManagerMetrics {
  numOverdueTasks: {
    total: AggregationsStringTermsBucketKeys[];
    [key: string]: AggregationsStringTermsBucketKeys[];
  };
}

type OverdueTaskAggBucket = AggregationsStringTermsBucketKeys & {
  overdueByHistogram: AggregationsStringTermsBucket;
};

export class TaskManagerMetricsCollector implements ITaskEventEmitter<TaskLifecycleEvent> {
  private store: TaskStore;
  private logger: Logger;
  private readonly pollInterval: number;

  private readonly taskTypes: Set<string>;
  private readonly excludedTypes: Set<string>;

  private running: boolean = false;

  // emit collected metrics
  private metrics$ = new Subject<TaskLifecycleEvent>();

  constructor({ logger, store, pollInterval, taskTypes, excludedTypes }: ConstructorOpts) {
    this.store = store;
    this.logger = logger;
    this.pollInterval = pollInterval ?? DEFAULT_POLL_INTERVAL;
    this.taskTypes = taskTypes;
    this.excludedTypes = excludedTypes;

    this.start();
  }

  public get events(): Observable<TaskLifecycleEvent> {
    return this.metrics$;
  }

  private start() {
    if (!this.running) {
      this.running = true;
      this.runCollectionCycle().catch(() => {});
    }
  }

  private async runCollectionCycle() {
    const start = Date.now();
    const searchedTypes = Array.from(this.taskTypes).filter(
      (type) => !this.excludedTypes.has(type)
    );
    try {
      const results = await this.store.aggregate({
        size: 0,
        query: {
          bool: {
            filter: [
              {
                bool: {
                  must: [OneOfTaskTypes('task.taskType', searchedTypes)],
                  should: [IdleTaskWithExpiredRunAt, RunningOrClaimingTaskWithExpiredRetryAt],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
        runtime_mappings: {
          overdueBySeconds: {
            type: 'long',
            script: {
              source: `
                def runAt = doc['task.runAt'];
                if(!runAt.empty) {
                  emit((new Date().getTime() - runAt.value.getMillis()) / 1000);
                } else {
                  def retryAt = doc['task.retryAt'];
                  if(!retryAt.empty) {
                    emit((new Date().getTime() - retryAt.value.getMillis()) / 1000);
                  } else {
                    emit(0);
                  }
                }
              `,
            },
          },
        },
        aggs: {
          overallOverdueByHistogram: {
            histogram: {
              field: 'overdueBySeconds',
              min_doc_count: 1,
              interval: 10,
            },
          },
          byTaskType: {
            terms: {
              field: 'task.taskType',
              size: 500,
            },
            aggs: {
              overdueByHistogram: {
                histogram: {
                  field: 'overdueBySeconds',
                  interval: 10,
                },
              },
            },
          },
        },
      });

      const aggregations =
        (results?.aggregations as {
          overallOverdueByHistogram: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys>;
          byTaskType: AggregationsTermsAggregateBase<OverdueTaskAggBucket>;
        }) ?? {};
      const byTaskType = ((aggregations.byTaskType.buckets as OverdueTaskAggBucket[]) ?? []).reduce(
        (acc: Record<string, number>, bucket: OverdueTaskAggBucket) => {
          acc[bucket.key] = bucket?.overdueByHistogram?.buckets ?? [];
          return acc;
        },
        {}
      );
      const metrics = {
        numOverdueTasks: {
          total:
            (aggregations?.overallOverdueByHistogram
              ?.buckets as AggregationsStringTermsBucketKeys[]) ?? [],
          ...byTaskType,
        },
      };
      this.metrics$.next(asTaskManagerMetricEvent(asOk(metrics)));
    } catch (e) {
      this.logger.debug(`Error querying for task manager metrics - ${e.message}`);
      // emit empty metrics so we don't have stale metrics
      this.metrics$.next(asTaskManagerMetricEvent(asOk({ numOverdueTasks: { total: [] } })));
    }
    if (this.running) {
      // Set the next runCycle call
      setTimeout(
        this.runCollectionCycle.bind(this),
        Math.max(this.pollInterval - (Date.now() - start), 0)
      );
    }
  }
}
