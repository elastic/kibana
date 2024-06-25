/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import { type TransformState, TRANSFORM_STATE } from '../constants';

export interface TransformHealthIssue {
  type: string;
  issue: string;
  details?: string;
  count: number;
  first_occurrence?: number;
}

export interface TransformHealth extends estypes.TransformGetTransformStatsTransformStatsHealth {
  issues?: TransformHealthIssue[];
}

export interface TransformStats extends estypes.TransformGetTransformStatsTransformStats {
  health?: TransformHealth;
  state: TransformState;
}

function isTransformState(arg: unknown): arg is TransformState {
  return typeof arg === 'string' && Object.values(TRANSFORM_STATE).includes(arg as TransformState);
}

export function isTransformStats(arg: unknown): arg is TransformStats {
  return isPopulatedObject(arg, ['state']) && isTransformState(arg.state);
}
