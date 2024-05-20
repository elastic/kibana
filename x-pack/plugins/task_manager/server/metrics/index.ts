/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { TaskManagerConfig } from '../config';
import { Metrics, createMetricsAggregators, createMetricsStream } from './metrics_stream';
import { TaskPollingLifecycle } from '../polling_lifecycle';
import { TaskManagerMetricsCollector } from './task_metrics_collector';
export type { Metrics } from './metrics_stream';

interface MetricsStreamOpts {
  config: TaskManagerConfig;
  reset$: Observable<boolean>; // emits when counter metrics should be reset
  taskPollingLifecycle?: TaskPollingLifecycle; // subscribe to task lifecycle events
  taskManagerMetricsCollector?: TaskManagerMetricsCollector; // subscribe to collected task manager metrics
}

export function metricsStream({
  config,
  reset$,
  taskPollingLifecycle,
  taskManagerMetricsCollector,
}: MetricsStreamOpts): Observable<Metrics> {
  return createMetricsStream(
    createMetricsAggregators({
      config,
      reset$,
      taskPollingLifecycle,
      taskManagerMetricsCollector,
    })
  );
}
