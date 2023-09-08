/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import {
  AggregationsStringTermsBucketKeys,
  AggregationsTermsAggregateBase,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Observable, Subject } from 'rxjs';
import { TaskStore } from '../../task_store';
import {
  IdleTaskWithExpiredRunAt,
  RunningOrClaimingTaskWithExpiredRetryAt,
} from '../../queries/mark_available_tasks_as_claimed';
import { ITaskEventEmitter, TaskLifecycleEvent } from '../../polling_lifecycle';
import { asTaskManagerMetricEvent } from '../../task_events';
import { asOk } from '../../lib/result_type';

const DEFAULT_POLL_INTERVAL = 5000; // query every 5 seconds
interface ConstructorOpts {
  logger: Logger;
  store: TaskStore;
  pollInterval?: number;
}

export interface TaskManagerMetrics {
  numOverdueTasks: {
    total: number;
    [key: string]: number;
  };
}
export class TaskManagerMetricsCollector implements ITaskEventEmitter<TaskLifecycleEvent> {
  private store: TaskStore;
  private logger: Logger;
  private readonly pollInterval: number;

  private running: boolean = false;

  // emit collected metrics
  private metrics$ = new Subject<TaskLifecycleEvent>();

  constructor({ logger, store, pollInterval }: ConstructorOpts) {
    this.store = store;
    this.logger = logger;
    this.pollInterval = pollInterval ?? DEFAULT_POLL_INTERVAL;

    this.start();
  }

  public get events(): Observable<TaskLifecycleEvent> {
    return this.metrics$;
  }

  private start() {
    if (!this.running) {
      this.running = true;
      this.runCollectionCycle();
    }
  }

  private async runCollectionCycle() {
    const start = Date.now();
    try {
      const results = await this.store.aggregate({
        size: 0,
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [IdleTaskWithExpiredRunAt, RunningOrClaimingTaskWithExpiredRetryAt],
                },
              },
            ],
          },
        },
        aggs: {
          byTaskType: {
            terms: {
              field: 'task.taskType',
              size: 500,
            },
          },
        },
      });
      const totalOverdueTasks =
        typeof results.hits.total === 'number' ? results.hits.total : results.hits.total?.value;
      const aggregations = results.aggregations as {
        byTaskType: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys>;
      };
      const byTaskType = (
        (aggregations.byTaskType.buckets as AggregationsStringTermsBucketKeys[]) ?? []
      ).reduce((acc: Record<string, number>, bucket: AggregationsStringTermsBucketKeys) => {
        acc[bucket.key] = bucket.doc_count;
        return acc;
      }, {});
      const metrics = {
        numOverdueTasks: {
          total: totalOverdueTasks ?? 0,
          ...byTaskType,
        },
      };
      this.metrics$.next(asTaskManagerMetricEvent(asOk(metrics)));
    } catch (e) {
      this.logger.debug(`Error querying for task manager metrics - ${e.message}`);
      // emit empty metrics so we don't have stale metrics
      this.metrics$.next(asTaskManagerMetricEvent(asOk({ numOverdueTasks: { total: 0 } })));
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
