/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { configSchema } from './config';

describe('config validation', () => {
  test('task manager defaults', () => {
    const config: Record<string, unknown> = {};
    expect(configSchema.validate(config)).toMatchInlineSnapshot(`
      Object {
        "enabled": true,
        "index": ".kibana_task_manager",
        "max_attempts": 3,
        "max_poll_inactivity_cycles": 10,
        "max_workers": 10,
        "poll_interval": 3000,
        "request_capacity": 1000,
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
});
