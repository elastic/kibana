/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { merge, of, Observable } from 'rxjs';
import { map, scan } from 'rxjs/operators';
import { set } from '@elastic/safer-lodash-set';
import { pick } from 'lodash';
import { Logger } from 'src/core/server';
import { JsonObject } from 'src/plugins/kibana_utils/common';
import { TaskManager } from '../task_manager';
import { createWorkloadAggregator, WorkloadStat } from './workload_statistics';
import { createTaskRunAggregator, summarizeTaskRunStat, TaskRunStat } from './task_run_statistics';
import { TaskManagerConfig } from '../config';
import { AggregatedStatProvider } from './runtime_statistics_aggregator';

export { AggregatedStatProvider, AggregatedStat } from './runtime_statistics_aggregator';

const CONFIG_FIELDS_TO_EXPOSE = [
  'max_workers',
  'poll_interval',
  'request_capacity',
  'max_poll_inactivity_cycles',
  'monitored_aggregated_stats_refresh_rate',
  'monitored_stats_running_average_window',
] as const;

type ConfigStat = Pick<TaskManagerConfig, typeof CONFIG_FIELDS_TO_EXPOSE[number]>;

export interface MonitoringStats {
  lastUpdate: string;
  stats: {
    configuration: {
      timestamp: string;
      value: ConfigStat;
    };
    workload?: {
      timestamp: string;
      value: WorkloadStat;
    };
    runtime?: {
      timestamp: string;
      value: TaskRunStat;
    };
  };
}

interface MonitoredStat {
  timestamp: string;
  value: JsonObject;
}

export interface RawMonitoringStats {
  lastUpdate: string;
  stats: Record<string, MonitoredStat>;
}

export function createAggregators(
  taskManager: TaskManager,
  config: TaskManagerConfig,
  logger: Logger
): AggregatedStatProvider {
  return merge(
    createTaskRunAggregator(taskManager, config.monitored_stats_running_average_window),
    createWorkloadAggregator(taskManager, config.monitored_aggregated_stats_refresh_rate, logger)
  );
}

export function createMonitoringStatsStream(
  provider$: AggregatedStatProvider,
  config: TaskManagerConfig
): Observable<MonitoringStats> {
  const initialStats = initializeStats(new Date().toISOString(), config);
  return merge(
    // emit the initial stats
    of(initialStats),
    // emit updated stats whenever a provider updates a specific key on the stats
    provider$.pipe(
      map(({ key, value }) => {
        return {
          value: { timestamp: new Date().toISOString(), value },
          key,
        };
      }),
      scan((monitoringStats: MonitoringStats, { key, value }) => {
        // incrementally merge stats as they come in
        set(monitoringStats.stats, key, value);
        monitoringStats.lastUpdate = new Date().toISOString();
        return monitoringStats;
      }, initialStats)
    )
  );
}

export function summarizeMonitoringStats({
  lastUpdate,
  stats: { runtime, ...otherStats },
}: MonitoringStats): RawMonitoringStats {
  return {
    lastUpdate,
    stats: {
      ...((otherStats as unknown) as RawMonitoringStats['stats']),
      ...(runtime
        ? {
            runtime: {
              ...runtime,
              value: summarizeTaskRunStat(runtime.value),
            },
          }
        : {}),
    },
  };
}

const initializeStats = (
  initialisationTimestamp: string,
  config: TaskManagerConfig
): MonitoringStats => ({
  lastUpdate: initialisationTimestamp,
  stats: {
    configuration: {
      timestamp: initialisationTimestamp,
      value: pick(config, ...CONFIG_FIELDS_TO_EXPOSE) as ConfigStat,
    },
  },
});
