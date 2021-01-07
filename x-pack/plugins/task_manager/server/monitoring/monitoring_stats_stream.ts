/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { merge, of, Observable } from 'rxjs';
import { map, scan } from 'rxjs/operators';
import { set } from '@elastic/safer-lodash-set';
import { Logger } from 'src/core/server';
import { JsonObject } from 'src/plugins/kibana_utils/common';
import { TaskStore } from '../task_store';
import { TaskPollingLifecycle } from '../polling_lifecycle';
import {
  createWorkloadAggregator,
  summarizeWorkloadStat,
  WorkloadStat,
} from './workload_statistics';
import {
  createTaskRunAggregator,
  summarizeTaskRunStat,
  TaskRunStat,
  SummarizedTaskRunStat,
} from './task_run_statistics';
import { ConfigStat, createConfigurationAggregator } from './configuration_statistics';
import { TaskManagerConfig } from '../config';
import { AggregatedStatProvider } from './runtime_statistics_aggregator';
import { ManagedConfiguration } from '../lib/create_managed_configuration';

export { AggregatedStatProvider, AggregatedStat } from './runtime_statistics_aggregator';

export interface MonitoringStats {
  last_update: string;
  stats: {
    configuration?: MonitoredStat<ConfigStat>;
    workload?: MonitoredStat<WorkloadStat>;
    runtime?: MonitoredStat<TaskRunStat>;
  };
}

export enum HealthStatus {
  OK = 'OK',
  Warning = 'warn',
  Error = 'error',
}

interface MonitoredStat<T> {
  timestamp: string;
  value: T;
}
type RawMonitoredStat<T extends JsonObject> = MonitoredStat<T> & {
  status: HealthStatus;
};

export interface RawMonitoringStats {
  last_update: string;
  stats: {
    configuration?: RawMonitoredStat<ConfigStat>;
    workload?: RawMonitoredStat<WorkloadStat>;
    runtime?: RawMonitoredStat<SummarizedTaskRunStat>;
  };
}

export function createAggregators(
  taskPollingLifecycle: TaskPollingLifecycle,
  taskStore: TaskStore,
  elasticsearchAndSOAvailability$: Observable<boolean>,
  config: TaskManagerConfig,
  managedConfig: ManagedConfiguration,
  logger: Logger
): AggregatedStatProvider {
  return merge(
    createConfigurationAggregator(config, managedConfig),
    createTaskRunAggregator(taskPollingLifecycle, config.monitored_stats_running_average_window),
    createWorkloadAggregator(
      taskStore,
      elasticsearchAndSOAvailability$,
      config.monitored_aggregated_stats_refresh_rate,
      config.poll_interval,
      logger
    )
  );
}

export function createMonitoringStatsStream(
  provider$: AggregatedStatProvider,
  config: TaskManagerConfig
): Observable<MonitoringStats> {
  const initialStats = {
    last_update: new Date().toISOString(),
    stats: {},
  };
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
        monitoringStats.last_update = new Date().toISOString();
        return monitoringStats;
      }, initialStats)
    )
  );
}

export function summarizeMonitoringStats(
  {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    last_update,
    stats: { runtime, workload, configuration },
  }: MonitoringStats,
  config: TaskManagerConfig
): RawMonitoringStats {
  return {
    last_update,
    stats: {
      ...(configuration
        ? {
            configuration: {
              ...configuration,
              status: HealthStatus.OK,
            },
          }
        : {}),
      ...(runtime
        ? {
            runtime: {
              timestamp: runtime.timestamp,
              ...summarizeTaskRunStat(runtime.value, config),
            },
          }
        : {}),
      ...(workload
        ? {
            workload: {
              timestamp: workload.timestamp,
              ...summarizeWorkloadStat(workload.value),
            },
          }
        : {}),
    },
  };
}
