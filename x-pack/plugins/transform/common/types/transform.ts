/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBoxOptionOption } from '@elastic/eui/src/components/combo_box/types';
import type { LatestFunctionConfig, PutTransformsRequestSchema } from '../api_schemas/transforms';
import { isPopulatedObject } from '../shared_imports';
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

export interface PivotConfigDefinition {
  group_by: PivotGroupByDict;
  aggregations: PivotAggDict;
}

/**
 * Transform with pivot configuration
 */
export type TransformPivotConfig = Omit<TransformBaseConfig, 'latest'> & {
  pivot: PivotConfigDefinition;
};

/**
 * Transform with latest function configuration
 */
export type TransformLatestConfig = Omit<TransformBaseConfig, 'pivot'> & {
  latest: LatestFunctionConfig;
};

export type TransformConfigUnion = TransformPivotConfig | TransformLatestConfig;

export function isPivotTransform(transform: unknown): transform is TransformPivotConfig {
  return isPopulatedObject(transform, ['pivot']);
}

export function isLatestTransform(transform: unknown): transform is TransformLatestConfig {
  return isPopulatedObject(transform, ['latest']);
}

export interface LatestFunctionConfigUI {
  unique_key: Array<EuiComboBoxOptionOption<string>> | undefined;
  sort: EuiComboBoxOptionOption<string> | undefined;
}
