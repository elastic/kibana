/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * This module contains the logic for polling the task manager index for new work.
 */

import { Observable, Subject } from 'rxjs';

import { Option, none } from 'fp-ts/lib/Option';
import { Logger } from '@kbn/core/server';
import { AggregationsTermsAggregateBase } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Result, asOk, asErr } from '../../lib/result_type';
import { TaskStore } from '../../task_store';
import {
  IdleTaskWithExpiredRunAt,
  RunningOrClaimingTaskWithExpiredRetryAt,
} from '../../queries/mark_available_tasks_as_claimed';

interface ConstructorOpts {
  logger: Logger;
  store: TaskStore;
  pollInterval: number;
}

export class TaskOverdueMetricsCollector {
  private store: TaskStore;
  private logger: Logger;

  private running: boolean = false;
  private timeoutId: NodeJS.Timeout | null = null;
  private hasSubscribed: boolean = false;

  constructor({ logger, store }: ConstructorOpts) {
    this.store = store;
    this.logger = logger;

    this.start();
  }

  private start() {
    if (!this.running) {
      this.running = true;
      this.runCollectionCycle();
    }
  }

  private async runCollectionCycle() {
    this.timeoutId = null;
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
        byTaskType: AggregationsTermsAggregateBase;
      };
      console.log(`createTaskMetricsCollector ${JSON.stringify(results)}`);
      subject.next(asOk(results));
    } catch (e) {
      subject.next(asPollingError<T>(e, PollingErrorType.WorkError));
    }
    if (this.running) {
      // Set the next runCycle call
      this.timeoutId = setTimeout(
        this.runCollectionCycle.bind(this),
        Math.max(pollInterval - (Date.now() - start), 0)
      );
    }
  }
}
