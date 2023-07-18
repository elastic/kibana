/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge, of, Observable } from 'rxjs';
import { map, scan } from 'rxjs/operators';
import { set } from '@kbn/safer-lodash-set';
import { Logger } from '@kbn/core/server';
import { TaskStore } from '../task_store';
import { TaskPollingLifecycle } from '../polling_lifecycle';
import { TaskManagerConfig } from '../config';
import { AggregatedStatProvider } from '../lib/runtime_statistics_aggregator';
import { createTaskClaimAggregator } from './task_claim_success_rate';

export interface Metrics {
  last_update: string;
  metrics: {
    task_claim_success?: SuccessRateMetric;
  };
}

export interface Metric<T> {
  timestamp: string;
  value: T;
}

export interface SuccessRate {
  success: number;
  total: number;
}
export type SuccessRateMetric = Metric<SuccessRate>;

interface CreateMetricsAggregatorsOpts {
  taskStore: TaskStore;
  elasticsearchAndSOAvailability$: Observable<boolean>;
  config: TaskManagerConfig;
  logger: Logger;
  taskPollingLifecycle?: TaskPollingLifecycle;
}
export function createMetricsAggregators({
  taskStore,
  elasticsearchAndSOAvailability$,
  config,
  logger,
  taskPollingLifecycle,
}: CreateMetricsAggregatorsOpts): AggregatedStatProvider {
  const aggregators: AggregatedStatProvider[] = [];
  if (taskPollingLifecycle) {
    aggregators.push(createTaskClaimAggregator(taskPollingLifecycle));
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
