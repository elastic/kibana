/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { PositiveInteger } from '@kbn/securitysolution-io-ts-types';

export type DurationMetric = t.TypeOf<typeof DurationMetric>;
export const DurationMetric = PositiveInteger;

export type RuleExecutionMetrics = t.TypeOf<typeof RuleExecutionMetrics>;
export const RuleExecutionMetrics = t.partial({
  total_search_duration_ms: DurationMetric,
  total_indexing_duration_ms: DurationMetric,
  execution_gap_duration_s: DurationMetric,
});
