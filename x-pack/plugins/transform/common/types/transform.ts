/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { LatestFunctionConfig, PutTransformsRequestSchema } from '../api_schemas/transforms';
import { PivotGroupByDict } from './pivot_group_by';
import { PivotAggDict } from './pivot_aggs';

export type IndexName = string;
export type IndexPattern = string;
export type TransformId = string;

/**
 * Generic type for transform response
 */
export type TransformBaseConfig = PutTransformsRequestSchema & {
  id: TransformId;
  create_time?: number;
  version?: string;
};

/**
 * Transform with pivot configuration
 */
export type TransformPivotConfig = Omit<TransformBaseConfig, 'latest'> & {
  pivot: {
    group_by: PivotGroupByDict;
    aggregations: PivotAggDict;
  };
};

/**
 * Transform with latest function configuration
 */
export type TransformLatestConfig = Omit<TransformBaseConfig, 'pivot'> & {
  latest: LatestFunctionConfig;
};

export function isPivotTransform(
  transform: TransformBaseConfig
): transform is TransformPivotConfig {
  return transform.hasOwnProperty('pivot');
}

export function isLatestTransform(
  transform: TransformBaseConfig
): transform is TransformLatestConfig {
  return transform.hasOwnProperty('latest');
}
