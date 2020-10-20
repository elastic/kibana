/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of } from 'rxjs';
import { pick } from 'lodash';
import { AggregatedStatProvider } from './runtime_statistics_aggregator';
import { TaskManagerConfig } from '../config';

const CONFIG_FIELDS_TO_EXPOSE = [
  'max_workers',
  'poll_interval',
  'request_capacity',
  'max_poll_inactivity_cycles',
  'monitored_aggregated_stats_refresh_rate',
  'monitored_stats_running_average_window',
  'monitored_task_execution_thresholds',
] as const;

export type ConfigStat = Pick<TaskManagerConfig, typeof CONFIG_FIELDS_TO_EXPOSE[number]>;

export function createConfigurationAggregator(
  config: TaskManagerConfig
): AggregatedStatProvider<ConfigStat> {
  const picked: ConfigStat = pick(config, ...CONFIG_FIELDS_TO_EXPOSE);
  return of({
    key: 'configuration',
    value: picked,
  });
}
