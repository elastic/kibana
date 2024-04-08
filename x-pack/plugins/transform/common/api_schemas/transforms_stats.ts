/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

import type { TransformStats } from '../types/transform_stats';

import { getTransformsRequestSchema } from './transforms';

export const getTransformsStatsRequestSchema = getTransformsRequestSchema;

export type GetTransformsStatsRequestSchema = TypeOf<typeof getTransformsStatsRequestSchema>;

export const getTransformStatsQuerySchema = schema.object({
  basic: schema.boolean(),
});

export type GetTransformStatsQuerySchema = TypeOf<typeof getTransformStatsQuerySchema>;
export interface GetTransformsStatsResponseSchema {
  node_failures?: object;
  count: number;
  transforms: TransformStats[];
}
