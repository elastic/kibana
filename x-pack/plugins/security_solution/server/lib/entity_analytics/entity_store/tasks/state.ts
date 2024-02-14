/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

/**
 * WARNING: Do not modify the existing versioned schema(s) below, instead define a new version (ex: 2, 3, 4).
 * This is required to support zero-downtime upgrades and rollbacks. See https://github.com/elastic/kibana/issues/155764.
 *
 * As you add a new schema version, don't forget to change latestTaskStateSchema variable to reference the latest schema.
 * For example, changing stateSchemaByVersion[1].schema to stateSchemaByVersion[2].schema.
 */
export const stateSchemaByVersion = {
  1: {
    // A task that was created < 8.10 will go through this "up" migration
    // to ensure it matches the v1 schema.
    up: (state: Record<string, unknown>) => ({
      timestamps: state.timestamps || undefined,
      runs: state.runs || 0,
      namespace: typeof state.namespace === 'string' ? state.namespace : 'default',
    }),
    schema: schema.object({
      timestamps: schema.maybe(
        schema.object({
          lastExecution: schema.maybe(schema.string()),
          lastProcessedCompositeTimestamp: schema.maybe(schema.string()),
          lastProcessedCriticalityTimestamp: schema.maybe(schema.string()),
          lastProcessedRiskScoreTimestamp: schema.maybe(schema.string()),
        })
      ),
      ids: schema.maybe(
        schema.object({
          lastProcessedCompositeId: schema.maybe(schema.string()),
          lastProcessedCriticalityId: schema.maybe(schema.string()),
          lastProcessedRiskScoreId: schema.maybe(
            schema.object({
              id_field: schema.string(),
              id_value: schema.string(),
            })
          ),
        })
      ),
      namespace: schema.string(),
      runs: schema.number(),
    }),
  },
};
const latestTaskStateSchema = stateSchemaByVersion[1].schema;
type Writeable<T> = { -readonly [P in keyof T]: T[P] };
export type LatestTaskStateSchema = Writeable<TypeOf<typeof latestTaskStateSchema>>;

export const defaultState: LatestTaskStateSchema = {
  timestamps: undefined,
  namespace: 'default',
  runs: 0,
};
