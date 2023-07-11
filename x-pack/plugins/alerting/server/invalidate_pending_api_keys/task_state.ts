/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const stateSchemaByVersion = {
  1: {
    up: (state: Record<string, unknown>) => ({
      runs: state.runs || 0,
      total_invalidated: state.total_invalidated || 0,
    }),
    schema: schema.object({
      runs: schema.number(),
      total_invalidated: schema.number(),
    }),
  },
};

const latestTaskStateSchema = stateSchemaByVersion[1].schema;
export type LatestTaskStateSchema = TypeOf<typeof latestTaskStateSchema>;

export const emptyState: LatestTaskStateSchema = {
  runs: 0,
  total_invalidated: 0,
};
