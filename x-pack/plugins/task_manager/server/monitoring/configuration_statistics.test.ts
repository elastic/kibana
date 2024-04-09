/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import { take, bufferCount } from 'rxjs/operators';
import { createConfigurationAggregator } from './configuration_statistics';
import { TaskManagerConfig } from '../config';

describe('Configuration Statistics Aggregator', () => {
  test('merges the static config with the merged configs', async () => {
    const configuration: TaskManagerConfig = {
      max_workers: 10,
      max_attempts: 9,
      poll_interval: 6000000,
      allow_reading_invalid_state: false,
      version_conflict_threshold: 80,
      monitored_stats_required_freshness: 6000000,
      request_capacity: 1000,
      monitored_aggregated_stats_refresh_rate: 5000,
      monitored_stats_health_verbose_log: {
        enabled: false,
        level: 'debug' as const,
        warn_delayed_task_start_in_seconds: 60,
      },
      monitored_stats_running_average_window: 50,
      monitored_task_execution_thresholds: {
        default: {
          error_threshold: 90,
          warn_threshold: 80,
        },
        custom: {},
      },
      ephemeral_tasks: {
        enabled: true,
        request_capacity: 10,
      },
      unsafe: {
        exclude_task_types: [],
        authenticate_background_task_utilization: true,
      },
      event_loop_delay: {
        monitor: true,
        warn_threshold: 5000,
      },
      worker_utilization_running_average_window: 5,
      metrics_reset_interval: 3000,
      claim_strategy: 'default',
      request_timeouts: {
        update_by_query: 1000,
      },
    };

    const managedConfig = {
      maxWorkersConfiguration$: new Subject<number>(),
      pollIntervalConfiguration$: new Subject<number>(),
    };

    return new Promise<void>(async (resolve, reject) => {
      try {
        createConfigurationAggregator(configuration, managedConfig)
          .pipe(take(3), bufferCount(3))
          .subscribe(([initial, updatedWorkers, updatedInterval]) => {
            expect(initial.value).toEqual({
              max_workers: 10,
              poll_interval: 6000000,
              request_capacity: 1000,
              monitored_aggregated_stats_refresh_rate: 5000,
              monitored_stats_running_average_window: 50,
              monitored_task_execution_thresholds: {
                default: {
                  error_threshold: 90,
                  warn_threshold: 80,
                },
                custom: {},
              },
            });
            expect(updatedWorkers.value).toEqual({
              max_workers: 8,
              poll_interval: 6000000,
              request_capacity: 1000,
              monitored_aggregated_stats_refresh_rate: 5000,
              monitored_stats_running_average_window: 50,
              monitored_task_execution_thresholds: {
                default: {
                  error_threshold: 90,
                  warn_threshold: 80,
                },
                custom: {},
              },
            });
            expect(updatedInterval.value).toEqual({
              max_workers: 8,
              poll_interval: 3000,
              request_capacity: 1000,
              monitored_aggregated_stats_refresh_rate: 5000,
              monitored_stats_running_average_window: 50,
              monitored_task_execution_thresholds: {
                default: {
                  error_threshold: 90,
                  warn_threshold: 80,
                },
                custom: {},
              },
            });
            resolve();
          }, reject);
        managedConfig.maxWorkersConfiguration$.next(8);
        managedConfig.pollIntervalConfiguration$.next(3000);
      } catch (error) {
        reject(error);
      }
    });
  });
});
