/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge, of, Observable } from 'rxjs';
import { map, scan } from 'rxjs/operators';
import { set } from '@kbn/safer-lodash-set';
import { TaskLifecycleEvent, TaskPollingLifecycle } from '../polling_lifecycle';
import { TaskManagerConfig } from '../config';
import { AggregatedStatProvider } from '../lib/runtime_statistics_aggregator';
import { isTaskPollingCycleEvent, isTaskRunEvent } from '../task_events';
import { TaskClaimMetric, TaskClaimMetricsAggregator } from './task_claim_metrics_aggregator';
import { createAggregator } from './create_aggregator';
import { TaskRunMetric, TaskRunMetricsAggregator } from './task_run_metrics_aggregator';
export interface Metrics {
  last_update: string;
  metrics: {
    task_claim?: Metric<TaskClaimMetric>;
    task_run?: Metric<TaskRunMetric>;
  };
}

export interface Metric<T> {
  timestamp: string;
  value: T;
}

interface CreateMetricsAggregatorsOpts {
  config: TaskManagerConfig;
  resetMetrics$: Observable<boolean>;
  taskPollingLifecycle?: TaskPollingLifecycle;
}
export function createMetricsAggregators({
  config,
  resetMetrics$,
  taskPollingLifecycle,
}: CreateMetricsAggregatorsOpts): AggregatedStatProvider {
  const aggregators: AggregatedStatProvider[] = [];
  if (taskPollingLifecycle) {
    aggregators.push(
      createAggregator({
        key: 'task_claim',
        taskPollingLifecycle,
        config,
        resetMetrics$,
        taskEventFilter: (taskEvent: TaskLifecycleEvent) => isTaskPollingCycleEvent(taskEvent),
        metricsAggregator: new TaskClaimMetricsAggregator(),
      }),
      createAggregator({
        key: 'task_run',
        taskPollingLifecycle,
        config,
        resetMetrics$,
        taskEventFilter: (taskEvent: TaskLifecycleEvent) => isTaskRunEvent(taskEvent),
        metricsAggregator: new TaskRunMetricsAggregator(),
      })
    );
  }
  return merge(...aggregators);
}

export function createMetricsStream(provider$: AggregatedStatProvider): Observable<Metrics> {
  const initialMetrics = {
    last_update: new Date().toISOString(),
    metrics: {},
  };
  return merge(
    // emit the initial metrics
    of(initialMetrics),
    // emit updated metrics whenever a provider updates a specific key on the stats
    provider$.pipe(
      map(({ key, value }) => {
        return {
          value: { timestamp: new Date().toISOString(), value },
          key,
        };
      }),
      scan((metrics: Metrics, { key, value }) => {
        // incrementally merge stats as they come in
        set(metrics.metrics, key, value);
        metrics.last_update = new Date().toISOString();
        return metrics;
      }, initialMetrics)
    )
  );
}
