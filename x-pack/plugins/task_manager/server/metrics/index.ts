/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { Observable } from 'rxjs';
import { TaskManagerConfig } from '../config';
import { Metrics, createMetricsAggregators, createMetricsStream } from './metrics_stream';
import { TaskStore } from '../task_store';
import { TaskPollingLifecycle } from '../polling_lifecycle';
export type { Metrics } from './metrics_stream';

export function metricsStream(
  taskStore: TaskStore,
  elasticsearchAndSOAvailability$: Observable<boolean>,
  config: TaskManagerConfig,
  logger: Logger,
  taskPollingLifecycle?: TaskPollingLifecycle
): Observable<Metrics> {
  return createMetricsStream(
    createMetricsAggregators({
      taskStore,
      elasticsearchAndSOAvailability$,
      config,
      logger,
      taskPollingLifecycle,
    })
  );
}
