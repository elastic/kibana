/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

const taskHealthStatus = schema.oneOf([
  schema.literal('ok'),
  schema.literal('warning'),
  schema.literal('error'),
]);
export type TaskHealthStatus = TypeOf<typeof taskHealthStatus>;

export const stateSchemaByVersion = {
  1: {
    up: (state: Record<string, unknown>) => ({
      runs: state.runs || 0,
      health_status: state.health_status || 'ok',
    }),
    schema: schema.object({
      runs: schema.number(),
      health_status: taskHealthStatus,
    }),
  },
};

const latestTaskStateSchema = stateSchemaByVersion[1].schema;
export type LatestTaskStateSchema = TypeOf<typeof latestTaskStateSchema>;

export const emptyState: LatestTaskStateSchema = {
  runs: 0,
  health_status: 'ok',
};
