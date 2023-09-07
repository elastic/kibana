/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SNAPSHOT_CUSTOM_AGGREGATIONS = ['avg', 'max', 'min', 'rate'] as const;
export const METRIC_EXPLORER_AGGREGATIONS = [
  'avg',
  'max',
  'min',
  'cardinality',
  'rate',
  'count',
  'sum',
  'p95',
  'p99',
  'custom',
] as const;
