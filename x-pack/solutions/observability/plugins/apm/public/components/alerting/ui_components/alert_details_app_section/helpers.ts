/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asPercent } from '@kbn/observability-plugin/common';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';

export const getAggsTypeFromRule = (ruleAggType: string): LatencyAggregationType => {
  if (ruleAggType === '95th') return LatencyAggregationType.p95;
  if (ruleAggType === '99th') return LatencyAggregationType.p99;
  return LatencyAggregationType.avg;
};

export const isLatencyThresholdRuleType = (ruleTypeId: string) =>
  ruleTypeId === 'apm.transaction_duration';

export const yLabelFormat = (y?: number | null) => {
  return asPercent(y || 0, 1);
};
