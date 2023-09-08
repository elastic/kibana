/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineLatest, filter, interval, map, merge, Observable, startWith } from 'rxjs';
import { JsonValue } from '@kbn/utility-types';
import { AggregatedStat, AggregatedStatProvider } from '../lib/runtime_statistics_aggregator';
import { TaskManagerConfig } from '../config';
import { ITaskMetricsAggregator } from './types';
import { TaskEvent } from '../task_events';

export interface CreateMetricsAggregatorOpts<T, E> {
  key: string;
  config: TaskManagerConfig;
  reset$?: Observable<boolean>;
  events$: Observable<E>;
  eventFilter: (event: E) => boolean;
  metricsAggregator: ITaskMetricsAggregator<T, E>;
}

export function createAggregator<T extends JsonValue, E extends TaskEvent<unknown, unknown>>({
  key,
  config,
  events$,
  reset$,
  eventFilter,
  metricsAggregator,
}: CreateMetricsAggregatorOpts<T, E>): AggregatedStatProvider<T> {
  if (reset$) {
    // Resets the aggregators either when the reset interval has passed or
    // a resetMetrics$ event is received
    merge(
      interval(config.metrics_reset_interval).pipe(map(() => true)),
      reset$.pipe(map(() => true))
    ).subscribe(() => {
      metricsAggregator.reset();
    });
  }

  const taskEvents$: Observable<T> = events$.pipe(
    filter((event: E) => eventFilter(event)),
    map((event: E) => {
      metricsAggregator.processEvent(event);
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
