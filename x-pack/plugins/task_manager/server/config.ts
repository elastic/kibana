/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const MAX_WORKERS_LIMIT = 100;
export const DEFAULT_MAX_WORKERS = 10;
export const DEFAULT_POLL_INTERVAL = 3000;
export const DEFAULT_MAX_POLL_INACTIVITY_CYCLES = 10;
export const DEFAULT_VERSION_CONFLICT_THRESHOLD = 80;
export const DEFAULT_MAX_EPHEMERAL_REQUEST_CAPACITY = MAX_WORKERS_LIMIT;

// Monitoring Constants
// ===================
// Refresh aggregated monitored stats at a default rate of once a minute
export const DEFAULT_MONITORING_REFRESH_RATE = 60 * 1000;
export const DEFAULT_MONITORING_STATS_RUNNING_AVERGAE_WINDOW = 50;
export const DEFAULT_MONITORING_STATS_WARN_DELAYED_TASK_START_IN_SECONDS = 60;

export const taskExecutionFailureThresholdSchema = schema.object(
  {
    error_threshold: schema.number({
      defaultValue: 90,
      min: 0,
    }),
    warn_threshold: schema.number({
      defaultValue: 80,
      min: 0,
    }),
  },
  {
    validate(config) {
      if (config.error_threshold < config.warn_threshold) {
        return `warn_threshold (${config.warn_threshold}) must be less than, or equal to, error_threshold (${config.error_threshold})`;
      }
    },
  }
);

const eventLoopDelaySchema = schema.object({
  monitor: schema.boolean({ defaultValue: true }),
  warn_threshold: schema.number({
    defaultValue: 5000,
    min: 10,
  }),
});

export const configSchema = schema.object(
  {
    enabled: schema.boolean({ defaultValue: true }),
    /* The maximum number of times a task will be attempted before being abandoned as failed */
    max_attempts: schema.number({
      defaultValue: 3,
      min: 1,
    }),
    /* How often, in milliseconds, the task manager will look for more work. */
    poll_interval: schema.number({
      defaultValue: DEFAULT_POLL_INTERVAL,
      min: 100,
    }),
    /* How many poll interval cycles can work take before it's timed out. */
    max_poll_inactivity_cycles: schema.number({
      defaultValue: DEFAULT_MAX_POLL_INACTIVITY_CYCLES,
      min: 1,
    }),
    /* How many requests can Task Manager buffer before it rejects new requests. */
    request_capacity: schema.number({
      // a nice round contrived number, feel free to change as we learn how it behaves
      defaultValue: 1000,
      min: 1,
    }),
    /* The name of the index used to store task information. */
    index: schema.string({
      defaultValue: '.kibana_task_manager',
      validate: (val) => {
        if (val.toLowerCase() === '.tasks') {
          return `"${val}" is an invalid Kibana Task Manager index, as it is already in use by the ElasticSearch Tasks Manager`;
        }
      },
    }),
    /* The maximum number of tasks that this Kibana instance will run simultaneously. */
    max_workers: schema.number({
      defaultValue: DEFAULT_MAX_WORKERS,
      // disable the task manager rather than trying to specify it with 0 workers
      min: 1,
    }),
    /* The threshold percenatge for workers experiencing version conflicts for shifting the polling interval. */
    version_conflict_threshold: schema.number({
      defaultValue: DEFAULT_VERSION_CONFLICT_THRESHOLD,
      min: 50,
      max: 100,
    }),
    /* The rate at which we emit fresh monitored stats. By default we'll use the poll_interval (+ a slight buffer) */
    monitored_stats_required_freshness: schema.number({
      defaultValue: (config?: unknown) =>
        ((config as { poll_interval: number })?.poll_interval ?? DEFAULT_POLL_INTERVAL) + 1000,
      min: 100,
    }),
    /* The rate at which we refresh monitored stats that require aggregation queries against ES. */
    monitored_aggregated_stats_refresh_rate: schema.number({
      defaultValue: DEFAULT_MONITORING_REFRESH_RATE,
      /* don't run monitored stat aggregations any faster than once every 5 seconds */
      min: 5000,
    }),
    /* The size of the running average window for monitored stats. */
    monitored_stats_running_average_window: schema.number({
      defaultValue: DEFAULT_MONITORING_STATS_RUNNING_AVERGAE_WINDOW,
      max: 100,
      min: 10,
    }),
    /* Task Execution result warn & error thresholds. */
    monitored_task_execution_thresholds: schema.object({
      default: taskExecutionFailureThresholdSchema,
      custom: schema.recordOf(schema.string(), taskExecutionFailureThresholdSchema, {
        defaultValue: {},
      }),
    }),
    monitored_stats_health_verbose_log: schema.object({
      enabled: schema.boolean({ defaultValue: false }),
      /* The amount of seconds we allow a task to delay before printing a warning server log */
      warn_delayed_task_start_in_seconds: schema.number({
        defaultValue: DEFAULT_MONITORING_STATS_WARN_DELAYED_TASK_START_IN_SECONDS,
      }),
    }),
    ephemeral_tasks: schema.object({
      enabled: schema.boolean({ defaultValue: false }),
      /* How many requests can Task Manager buffer before it rejects new requests. */
      request_capacity: schema.number({
        // a nice round contrived number, feel free to change as we learn how it behaves
        defaultValue: 10,
        min: 1,
        max: DEFAULT_MAX_EPHEMERAL_REQUEST_CAPACITY,
      }),
    }),
    event_loop_delay: eventLoopDelaySchema,
    /* These are not designed to be used by most users. Please use caution when changing these */
    unsafe: schema.object({
      exclude_task_types: schema.arrayOf(schema.string(), { defaultValue: [] }),
    }),
  },
  {
    validate: (config) => {
      if (
        config.monitored_stats_required_freshness &&
        config.poll_interval &&
        config.monitored_stats_required_freshness < config.poll_interval
      ) {
        return `The specified monitored_stats_required_freshness (${config.monitored_stats_required_freshness}) is invalid, as it is below the poll_interval (${config.poll_interval})`;
      }
    },
  }
);

export type TaskManagerConfig = TypeOf<typeof configSchema>;
export type TaskExecutionFailureThreshold = TypeOf<typeof taskExecutionFailureThresholdSchema>;
export type EventLoopDelayConfig = TypeOf<typeof eventLoopDelaySchema>;
