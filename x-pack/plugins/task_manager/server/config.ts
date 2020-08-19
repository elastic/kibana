/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const DEFAULT_MAX_WORKERS = 10;
export const DEFAULT_POLL_INTERVAL = 3000;
export const DEFAULT_MAX_POLL_INACTIVITY_CYCLES = 10;

export const configSchema = schema.object({
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
});

export type TaskManagerConfig = TypeOf<typeof configSchema>;
