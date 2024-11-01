/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

const stringOrNumberOrBoolean = z.union([z.string(), z.number(), z.boolean()]);

export const rerouteFilterConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'contains', 'startsWith', 'endsWith']),
  value: stringOrNumberOrBoolean,
});

export type RerouteFilterCondition = z.infer<typeof rerouteFilterConditionSchema>;

export interface RerouteAndCondition {
  and: RerouteCondition[];
}

export interface RerouteOrCondition {
  or: RerouteCondition[];
}

export type RerouteCondition = RerouteFilterCondition | RerouteAndCondition | RerouteOrCondition;

export const rerouteConditionSchema: z.ZodType<RerouteCondition> = z.lazy(() =>
  z.union([
    rerouteFilterConditionSchema,
    z.object({ and: z.array(rerouteConditionSchema) }),
    z.object({ or: z.array(rerouteConditionSchema) }),
  ])
);

/**
 * Example of a "root" stream
 * {
 *   "id": "logs",
 * }
 *
 * Example of a forked stream
 * {
 *    "id": "logs.nginx",
 *    "condition": { field: 'log.logger, operator: 'eq', value": "nginx_proxy" }
 *    "forked_from": "logs"
 * }
 */

export const streamDefinitonSchema = z.object({
  id: z.string(),
  forked_from: z.optional(z.string()),
  condition: z.optional(rerouteConditionSchema),
  root: z.boolean().default(false),
});

export type StreamDefinition = z.infer<typeof streamDefinitonSchema>;
