/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React from 'react';
import { asPercent } from '@kbn/observability-plugin/common';
import { ApmRuleType } from '@kbn/rule-data-utils';
import {
  AlertThresholdAnnotation,
  AlertThresholdTimeRangeRect,
} from '@kbn/observability-alert-details';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';

export const getAggsTypeFromRule = (ruleAggType: string): LatencyAggregationType => {
  if (ruleAggType === '95th') return LatencyAggregationType.p95;
  if (ruleAggType === '99th') return LatencyAggregationType.p99;
  return LatencyAggregationType.avg;
};

export const isLatencyThresholdRuleType = (ruleTypeId: string) =>
  ruleTypeId === ApmRuleType.TransactionDuration;

export const isFailedTransactionRateRuleType = (ruleTypeId: string) =>
  ruleTypeId === ApmRuleType.TransactionErrorRate;

export const yLabelFormat = (y?: number | null) => {
  return asPercent(y || 0, 1);
};

export const getThresholdAnnotations = (
  alertEvalThreshold: number | undefined,
  dangerColor: string
): ReactElement[] => {
  if (alertEvalThreshold == null) return [];

  return [
    <AlertThresholdTimeRangeRect
      key={'alertThresholdRect'}
      id={'alertThresholdRect'}
      threshold={alertEvalThreshold}
      color={dangerColor}
    />,
    <AlertThresholdAnnotation
      id={'alertThresholdAnnotation'}
      key={'alertThresholdAnnotation'}
      color={dangerColor}
      threshold={alertEvalThreshold}
    />,
  ];
};
