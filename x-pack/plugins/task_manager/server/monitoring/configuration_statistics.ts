/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineLatest, of, BehaviorSubject } from 'rxjs';
import { pick, merge } from 'lodash';
import { map, startWith } from 'rxjs/operators';
import { AggregatedStatProvider } from './runtime_statistics_aggregator';
import { TaskManagerConfig } from '../config';

const CONFIG_FIELDS_TO_EXPOSE = [
  'request_capacity',
  'max_poll_inactivity_cycles',
  'monitored_aggregated_stats_refresh_rate',
  'monitored_stats_running_average_window',
  'monitored_task_execution_thresholds',
] as const;

export type ConfigStat = Pick<
  TaskManagerConfig,
  'max_workers' | 'poll_interval' | typeof CONFIG_FIELDS_TO_EXPOSE[number]
>;

export function createConfigurationAggregator(
  config: TaskManagerConfig,
  maxWorkers$: BehaviorSubject<number>,
  pollInterval$: BehaviorSubject<number>,
): AggregatedStatProvider<ConfigStat> {
  return combineLatest([
    of(pick(config, ...CONFIG_FIELDS_TO_EXPOSE)),
    pollInterval$.pipe(
      startWith(config.poll_interval),
      map<number, Pick<TaskManagerConfig, 'poll_interval'>>((pollInterval) => ({
        poll_interval: pollInterval,
      }))
    ),
    maxWorkers$.pipe(
      startWith(config.max_workers),
      map<number, Pick<TaskManagerConfig, 'max_workers'>>((maxWorkers) => ({
        max_workers: maxWorkers,
      }))
    ),
  ]).pipe(
    map((configurations) => ({
      key: 'configuration',
      value: merge({}, ...configurations),
    }))
  );
}
