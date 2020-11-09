/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf } from '@kbn/config-schema';

import { TransformStats } from '../types/transform_stats';

import { getTransformsRequestSchema } from './transforms';

export const getTransformsStatsRequestSchema = getTransformsRequestSchema;

export type GetTransformsRequestSchema = TypeOf<typeof getTransformsStatsRequestSchema>;

export interface GetTransformsStatsResponseSchema {
  node_failures?: object;
  count: number;
  transforms: TransformStats[];
}
