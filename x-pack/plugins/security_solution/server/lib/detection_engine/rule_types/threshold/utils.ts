/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { v5 as uuidv5 } from 'uuid';
import type {
  ThresholdNormalized,
  ThresholdWithCardinality,
} from '../../../../../common/detection_engine/rule_schema';

export const shouldFilterByCardinality = (
  threshold: ThresholdNormalized
): threshold is ThresholdWithCardinality => !!threshold.cardinality?.length;

export const calculateThresholdSignalUuid = (
  ruleId: string,
  startedAt: Date,
  thresholdFields: string[],
  key?: string
): string => {
  // used to generate stable Threshold Signals ID when run with the same params
  const NAMESPACE_ID = '0684ec03-7201-4ee0-8ee0-3a3f6b2479b2';

  const startedAtString = startedAt.toISOString();
  const keyString = key ?? '';
  const baseString = `${ruleId}${startedAtString}${thresholdFields.join(',')}${keyString}`;

  return uuidv5(baseString, NAMESPACE_ID);
};

export const getThresholdTermsHash = (
  terms: Array<{
    field: string;
    value: string;
  }>
): string => {
  return createHash('sha256')
    .update(
      terms
        .sort((term1, term2) => (term1.field > term2.field ? 1 : -1))
        .map((term) => {
          return `${term.field}:${term.value}`;
        })
        .join(',')
    )
    .digest('hex');
};
