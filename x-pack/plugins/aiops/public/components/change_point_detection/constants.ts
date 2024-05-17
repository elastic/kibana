/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const fnOperationTypeMapping: Record<string, string> = {
  avg: 'average',
  max: 'max',
  min: 'min',
  sum: 'sum',
} as const;

export const DEFAULT_AGG_FUNCTION = 'avg';

export const SPLIT_FIELD_CARDINALITY_LIMIT = 10000;

export const COMPOSITE_AGG_SIZE = 500;

export const CHANGE_POINT_TYPES = {
  DIP: 'dip',
  SPIKE: 'spike',
  DISTRIBUTION_CHANGE: 'distribution_change',
  STEP_CHANGE: 'step_change',
  TREND_CHANGE: 'trend_change',
  STATIONARY: 'stationary',
  NON_STATIONARY: 'non_stationary',
  INDETERMINABLE: 'indeterminable',
} as const;

export type ChangePointType = (typeof CHANGE_POINT_TYPES)[keyof typeof CHANGE_POINT_TYPES];

export const EXCLUDED_CHANGE_POINT_TYPES = new Set<ChangePointType>([
  CHANGE_POINT_TYPES.STATIONARY,
  CHANGE_POINT_TYPES.NON_STATIONARY,
  CHANGE_POINT_TYPES.INDETERMINABLE,
]);

export const MAX_CHANGE_POINT_CONFIGS = 6;

export const CHANGE_POINT_DETECTION_EVENT = {
  RUN: 'ran_aiops_change_point_detection',
  SUCCESS: 'aiops_change_point_detection_success',
  ERROR: 'aiops_change_point_detection_error',
} as const;
