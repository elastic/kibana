/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';

import type {
  EntriesArray,
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';

import { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { hasLargeValueList } from '@kbn/securitysolution-list-utils';

import { Threshold, ThresholdNormalized } from './schemas/common';

export const hasLargeValueItem = (
  exceptionItems: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>
) => {
  return exceptionItems.some((exceptionItem) => hasLargeValueList(exceptionItem.entries));
};

export const hasNestedEntry = (entries: EntriesArray): boolean => {
  const found = entries.filter(({ type }) => type === 'nested');
  return found.length > 0;
};

export const hasEqlSequenceQuery = (ruleQuery: string | undefined): boolean => {
  if (ruleQuery != null) {
    const parsedQuery = ruleQuery.trim().split(/[ \t\r\n]+/);
    return parsedQuery[0] === 'sequence' && parsedQuery[1] !== 'where';
  }
  return false;
};

export const isEqlRule = (ruleType: Type | undefined): boolean => ruleType === 'eql';
export const isThresholdRule = (ruleType: Type | undefined): boolean => ruleType === 'threshold';
export const isQueryRule = (ruleType: Type | undefined): boolean =>
  ruleType === 'query' || ruleType === 'saved_query';
export const isThreatMatchRule = (ruleType: Type | undefined): boolean =>
  ruleType === 'threat_match';

export const normalizeThresholdField = (
  thresholdField: string | string[] | null | undefined
): string[] => {
  return Array.isArray(thresholdField)
    ? thresholdField
    : isEmpty(thresholdField)
    ? []
    : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      [thresholdField!];
};

export const normalizeThresholdObject = (threshold: Threshold): ThresholdNormalized => {
  return {
    ...threshold,
    field: normalizeThresholdField(threshold.field),
  };
};

export const normalizeMachineLearningJobIds = (value: string | string[]): string[] =>
  Array.isArray(value) ? value : [value];
