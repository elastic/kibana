/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf } from '@kbn/config-schema';

import { TransformStats } from '../types/transform_stats';

import { transformsRequestSchema } from './transforms';

export const transformsStatsRequestSchema = transformsRequestSchema;

export type TransformsRequestSchema = TypeOf<typeof transformsStatsRequestSchema>;

export interface TransformsStatsResponseSchema {
  node_failures?: object;
  count: number;
  transforms: TransformStats[];
}

export const isTransformsStatsResponseSchema = (arg: any): arg is TransformsStatsResponseSchema => {
  return (
    {}.hasOwnProperty.call(arg, 'count') &&
    {}.hasOwnProperty.call(arg, 'transforms') &&
    Array.isArray(arg.transforms)
  );
};
