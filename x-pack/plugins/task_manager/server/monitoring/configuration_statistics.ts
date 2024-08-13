/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineLatest, of } from 'rxjs';
import { pick, merge } from 'lodash';
import { map, startWith } from 'rxjs';
import { JsonObject } from '@kbn/utility-types';
import { AggregatedStatProvider } from '../lib/runtime_statistics_aggregator';
import { CLAIM_STRATEGY_DEFAULT, TaskManagerConfig } from '../config';
import { ManagedConfiguration } from '../lib/create_managed_configuration';
import { getCapacityInCost, getCapacityInWorkers } from '../task_pool';

const CONFIG_FIELDS_TO_EXPOSE = [
  'request_capacity',
  'monitored_aggregated_stats_refresh_rate',
  'monitored_stats_running_average_window',
  'monitored_task_execution_thresholds',
] as const;

interface CapacityConfig extends JsonObject {
  capacity: {
    config: number;
    as_workers: number;
    as_cost: number;
  };
}

export type ConfigStat = Pick<
  TaskManagerConfig,
  'poll_interval' | 'claim_strategy' | (typeof CONFIG_FIELDS_TO_EXPOSE)[number]
> &
  CapacityConfig;

export function createConfigurationAggregator(
  config: TaskManagerConfig,
  managedConfig: ManagedConfiguration
): AggregatedStatProvider<ConfigStat> {
  return combineLatest([
    of(pick(config, ...CONFIG_FIELDS_TO_EXPOSE)),
    of({ claim_strategy: config.claim_strategy ?? CLAIM_STRATEGY_DEFAULT }),
    managedConfig.pollIntervalConfiguration$.pipe(
      startWith(config.poll_interval),
      map<number, Pick<TaskManagerConfig, 'poll_interval'>>((pollInterval) => ({
        poll_interval: pollInterval,
      }))
    ),
    managedConfig.capacityConfiguration$.pipe(
      startWith(managedConfig.startingCapacity),
      map<number, CapacityConfig>((capacity) => ({
        capacity: {
          config: capacity,
          as_workers: getCapacityInWorkers(capacity),
          as_cost: getCapacityInCost(capacity),
        },
      }))
    ),
  ]).pipe(
    map((configurations) => ({
      key: 'configuration',
      value: merge({}, ...configurations),
    }))
  );
}
