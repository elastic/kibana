/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineLatest, filter, interval, map, merge, Observable, startWith } from 'rxjs';
import { JsonValue } from '@kbn/utility-types';
import { TaskLifecycleEvent, TaskPollingLifecycle } from '../polling_lifecycle';
import { AggregatedStat, AggregatedStatProvider } from '../lib/runtime_statistics_aggregator';
import { TaskManagerConfig } from '../config';
import { ITaskMetricsAggregator } from './types';

export interface CreateMetricsAggregatorOpts<T> {
  key: string;
  config: TaskManagerConfig;
  resetMetrics$: Observable<boolean>;
  taskPollingLifecycle: TaskPollingLifecycle;
  taskEventFilter: (taskEvent: TaskLifecycleEvent) => boolean;
  metricsAggregator: ITaskMetricsAggregator<T>;
}

export function createAggregator<T extends JsonValue>({
  key,
  taskPollingLifecycle,
  config,
  resetMetrics$,
  taskEventFilter,
  metricsAggregator,
}: CreateMetricsAggregatorOpts<T>): AggregatedStatProvider<T> {
  // Resets the aggregators either when the reset interval has passed or
  // a resetMetrics$ event is received
  merge(
    interval(config.metrics_reset_interval).pipe(map(() => true)),
    resetMetrics$.pipe(map(() => true))
  ).subscribe(() => {
    metricsAggregator.reset();
  });

  const taskEvents$: Observable<T> = taskPollingLifecycle.events.pipe(
    filter((taskEvent: TaskLifecycleEvent) => taskEventFilter(taskEvent)),
    map((taskEvent: TaskLifecycleEvent) => {
      metricsAggregator.processTaskLifecycleEvent(taskEvent);
      return metricsAggregator.collect();
    })
  );

  return combineLatest([taskEvents$.pipe(startWith(metricsAggregator.initialMetric()))]).pipe(
    map(([value]: [T]) => {
      return {
        key,
        value,
      } as AggregatedStat<T>;
    })
  );
}
