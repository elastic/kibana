/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configSchema } from './config';

describe('config validation', () => {
  test('task manager defaults', () => {
    const config: Record<string, unknown> = {};
    expect(configSchema.validate(config)).toMatchInlineSnapshot(`
      Object {
        "enabled": true,
        "ephemeral_tasks": Object {
          "enabled": false,
          "request_capacity": 10,
        },
        "index": ".kibana_task_manager",
        "event_loop_delay": Object {
          "monitor": true,
          "warn_threshold": 5000,
        },
        "max_attempts": 3,
        "max_poll_inactivity_cycles": 10,
        "max_workers": 10,
        "monitored_aggregated_stats_refresh_rate": 60000,
        "monitored_stats_health_verbose_log": Object {
          "enabled": false,
          "warn_delayed_task_start_in_seconds": 60,
        },
        "monitored_stats_required_freshness": 4000,
        "monitored_stats_running_average_window": 50,
        "monitored_task_execution_thresholds": Object {
          "custom": Object {},
          "default": Object {
            "error_threshold": 90,
            "warn_threshold": 80,
          },
        },
        "poll_interval": 3000,
        "request_capacity": 1000,
        "unsafe": Object {
          "exclude_task_types": Array [],
        },
        "version_conflict_threshold": 80,
      }
    `);
  });

  test('the ElastiSearch Tasks index cannot be used for task manager', () => {
    const config: Record<string, unknown> = {
      index: '.tasks',
    };
    expect(() => {
      configSchema.validate(config);
    }).toThrowErrorMatchingInlineSnapshot(
      `"[index]: \\".tasks\\" is an invalid Kibana Task Manager index, as it is already in use by the ElasticSearch Tasks Manager"`
    );
  });

  test('the required freshness of the monitored stats config must always be less-than-equal to the poll interval', () => {
    const config: Record<string, unknown> = {
      monitored_stats_required_freshness: 100,
    };
    expect(() => {
      configSchema.validate(config);
    }).toThrowErrorMatchingInlineSnapshot(
      `"The specified monitored_stats_required_freshness (100) is invalid, as it is below the poll_interval (3000)"`
    );
  });

  test('the default required freshness of the monitored stats is poll interval with a slight buffer', () => {
    const config: Record<string, unknown> = {};
    expect(configSchema.validate(config)).toMatchInlineSnapshot(`
      Object {
        "enabled": true,
        "ephemeral_tasks": Object {
          "enabled": false,
          "request_capacity": 10,
        },
        "index": ".kibana_task_manager",
        "event_loop_delay": Object {
          "monitor": true,
          "warn_threshold": 5000,
        },
        "max_attempts": 3,
        "max_poll_inactivity_cycles": 10,
        "max_workers": 10,
        "monitored_aggregated_stats_refresh_rate": 60000,
        "monitored_stats_health_verbose_log": Object {
          "enabled": false,
          "warn_delayed_task_start_in_seconds": 60,
        },
        "monitored_stats_required_freshness": 4000,
        "monitored_stats_running_average_window": 50,
        "monitored_task_execution_thresholds": Object {
          "custom": Object {},
          "default": Object {
            "error_threshold": 90,
            "warn_threshold": 80,
          },
        },
        "poll_interval": 3000,
        "request_capacity": 1000,
        "unsafe": Object {
          "exclude_task_types": Array [],
        },
        "version_conflict_threshold": 80,
      }
    `);
  });

  test('the custom monitored_task_execution_thresholds can be configured at task type', () => {
    const config: Record<string, unknown> = {
      monitored_task_execution_thresholds: {
        custom: {
          'alerting:always-fires': {
            error_threshold: 50,
            warn_threshold: 30,
          },
        },
      },
    };
    expect(configSchema.validate(config)).toMatchInlineSnapshot(`
      Object {
        "enabled": true,
        "ephemeral_tasks": Object {
          "enabled": false,
          "request_capacity": 10,
        },
        "index": ".kibana_task_manager",
        "event_loop_delay": Object {
          "monitor": true,
          "warn_threshold": 5000,
        },
        "max_attempts": 3,
        "max_poll_inactivity_cycles": 10,
        "max_workers": 10,
        "monitored_aggregated_stats_refresh_rate": 60000,
        "monitored_stats_health_verbose_log": Object {
          "enabled": false,
          "warn_delayed_task_start_in_seconds": 60,
        },
        "monitored_stats_required_freshness": 4000,
        "monitored_stats_running_average_window": 50,
        "monitored_task_execution_thresholds": Object {
          "custom": Object {
            "alerting:always-fires": Object {
              "error_threshold": 50,
              "warn_threshold": 30,
            },
          },
          "default": Object {
            "error_threshold": 90,
            "warn_threshold": 80,
          },
        },
        "poll_interval": 3000,
        "request_capacity": 1000,
        "unsafe": Object {
          "exclude_task_types": Array [],
        },
        "version_conflict_threshold": 80,
      }
    `);
  });

  test('the monitored_task_execution_thresholds ensures that the default warn_threshold is lt the default error_threshold', () => {
    const config: Record<string, unknown> = {
      monitored_task_execution_thresholds: {
        default: {
          warn_threshold: 80,
          error_threshold: 70,
        },
      },
    };
    expect(() => {
      configSchema.validate(config);
    }).toThrowErrorMatchingInlineSnapshot(
      `"[monitored_task_execution_thresholds.default]: warn_threshold (80) must be less than, or equal to, error_threshold (70)"`
    );
  });

  test('the monitored_task_execution_thresholds allows the default warn_threshold to equal the default error_threshold', () => {
    const config: Record<string, unknown> = {
      monitored_task_execution_thresholds: {
        default: {
          warn_threshold: 70,
          error_threshold: 70,
        },
      },
    };
    expect(() => {
      configSchema.validate(config);
    }).not.toThrowError();
  });

  test('the monitored_task_execution_thresholds ensures that the warn_threshold is lte error_threshold on custom thresholds', () => {
    const config: Record<string, unknown> = {
      monitored_task_execution_thresholds: {
        custom: {
          'alerting:always-fires': {
            error_threshold: 80,
            warn_threshold: 90,
          },
        },
      },
    };
    expect(() => {
      configSchema.validate(config);
    }).toThrowErrorMatchingInlineSnapshot(
      `"[monitored_task_execution_thresholds.custom.alerting:always-fires]: warn_threshold (90) must be less than, or equal to, error_threshold (80)"`
    );
  });

  test('the monitored_task_execution_thresholds allows a custom error_threshold which is lower than the default warn_threshold', () => {
    const config: Record<string, unknown> = {
      monitored_task_execution_thresholds: {
        default: {
          warn_threshold: 80,
          error_threshold: 90,
        },
        custom: {
          'alerting:always-fires': {
            error_threshold: 60,
            warn_threshold: 50,
          },
        },
      },
    };
    expect(() => {
      configSchema.validate(config);
    }).not.toThrowError();
  });
});
