/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const MAX_WORKERS_LIMIT = 100;
export const DEFAULT_CAPACITY = 10;
export const MAX_CAPACITY = 50;
export const MIN_CAPACITY = 5;
export const DEFAULT_MAX_WORKERS = 10;
export const DEFAULT_POLL_INTERVAL = 3000;
export const MGET_DEFAULT_POLL_INTERVAL = 500;
export const DEFAULT_VERSION_CONFLICT_THRESHOLD = 80;
export const DEFAULT_MAX_EPHEMERAL_REQUEST_CAPACITY = MAX_WORKERS_LIMIT;

// Monitoring Constants
// ===================
// Refresh aggregated monitored stats at a default rate of once a minute
export const DEFAULT_MONITORING_REFRESH_RATE = 60 * 1000;
export const DEFAULT_MONITORING_STATS_RUNNING_AVERAGE_WINDOW = 50;
export const DEFAULT_MONITORING_STATS_WARN_DELAYED_TASK_START_IN_SECONDS = 60;

export const DEFAULT_METRICS_RESET_INTERVAL = 30 * 1000; // 30 seconds

// At the default poll interval of 3sec, this averages over the last 15sec.
export const DEFAULT_WORKER_UTILIZATION_RUNNING_AVERAGE_WINDOW = 5;

export const CLAIM_STRATEGY_DEFAULT = 'default';
export const CLAIM_STRATEGY_MGET = 'unsafe_mget';

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

const requestTimeoutsConfig = schema.object({
  /* The request timeout config for task manager's updateByQuery default:30s, min:10s, max:10m */
  update_by_query: schema.number({ defaultValue: 1000 * 30, min: 1000 * 10, max: 1000 * 60 * 10 }),
});

export const configSchema = schema.object(
  {
    allow_reading_invalid_state: schema.boolean({ defaultValue: true }),
    /* The number of normal cost tasks that this Kibana instance will run simultaneously */
    capacity: schema.maybe(schema.number({ min: MIN_CAPACITY, max: MAX_CAPACITY })),
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
    /* The maximum number of times a task will be attempted before being abandoned as failed */
    max_attempts: schema.number({
      defaultValue: 3,
      min: 1,
    }),
    /* The maximum number of tasks that this Kibana instance will run simultaneously. */
    max_workers: schema.maybe(
      schema.number({
        // disable the task manager rather than trying to specify it with 0 workers
        min: 1,
      })
    ),
    /* The interval at which monotonically increasing metrics counters will reset */
    metrics_reset_interval: schema.number({
      defaultValue: DEFAULT_METRICS_RESET_INTERVAL,
      min: 10 * 1000, // minimum 10 seconds
    }),
    /* The rate at which we refresh monitored stats that require aggregation queries against ES. */
    monitored_aggregated_stats_refresh_rate: schema.number({
      defaultValue: DEFAULT_MONITORING_REFRESH_RATE,
      /* don't run monitored stat aggregations any faster than once every 5 seconds */
      min: 5000,
    }),
    monitored_stats_health_verbose_log: schema.object({
      enabled: schema.boolean({ defaultValue: false }),
      level: schema.oneOf([schema.literal('debug'), schema.literal('info')], {
        defaultValue: 'debug',
      }),
      /* The amount of seconds we allow a task to delay before printing a warning server log */
      warn_delayed_task_start_in_seconds: schema.number({
        defaultValue: DEFAULT_MONITORING_STATS_WARN_DELAYED_TASK_START_IN_SECONDS,
      }),
    }),
    /* The rate at which we emit fresh monitored stats. By default we'll use the poll_interval (+ a slight buffer) */
    monitored_stats_required_freshness: schema.number({
      defaultValue: (config?: unknown) =>
        ((config as { poll_interval: number })?.poll_interval ?? DEFAULT_POLL_INTERVAL) + 1000,
      min: 100,
    }),
    /* The size of the running average window for monitored stats. */
    monitored_stats_running_average_window: schema.number({
      defaultValue: DEFAULT_MONITORING_STATS_RUNNING_AVERAGE_WINDOW,
      max: 100,
      min: 10,
    }),
    /* Task Execution result warn & error thresholds. */
    monitored_task_execution_thresholds: schema.object({
      custom: schema.recordOf(schema.string(), taskExecutionFailureThresholdSchema, {
        defaultValue: {},
      }),
      default: taskExecutionFailureThresholdSchema,
    }),
    /* How often, in milliseconds, the task manager will look for more work. */
    poll_interval: schema.conditional(
      schema.siblingRef('claim_strategy'),
      CLAIM_STRATEGY_MGET,
      schema.number({
        defaultValue: MGET_DEFAULT_POLL_INTERVAL,
        min: 100,
      }),
      schema.number({
        defaultValue: DEFAULT_POLL_INTERVAL,
        min: 100,
      })
    ),
    /* How many requests can Task Manager buffer before it rejects new requests. */
    request_capacity: schema.number({
      // a nice round contrived number, feel free to change as we learn how it behaves
      defaultValue: 1000,
      min: 1,
    }),
    /* These are not designed to be used by most users. Please use caution when changing these */
    unsafe: schema.object({
      authenticate_background_task_utilization: schema.boolean({ defaultValue: true }),
      exclude_task_types: schema.arrayOf(schema.string(), { defaultValue: [] }),
    }),
    /* The threshold percenatge for workers experiencing version conflicts for shifting the polling interval. */
    version_conflict_threshold: schema.number({
      defaultValue: DEFAULT_VERSION_CONFLICT_THRESHOLD,
      min: 50,
      max: 100,
    }),
    worker_utilization_running_average_window: schema.number({
      defaultValue: DEFAULT_WORKER_UTILIZATION_RUNNING_AVERAGE_WINDOW,
      max: 100,
      min: 1,
    }),
    claim_strategy: schema.string({ defaultValue: CLAIM_STRATEGY_DEFAULT }),
    request_timeouts: requestTimeoutsConfig,
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
export type RequestTimeoutsConfig = TypeOf<typeof requestTimeoutsConfig>;
