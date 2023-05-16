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

import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import type { ExceptionsBuilderExceptionItem } from '@kbn/securitysolution-list-utils';
import { hasLargeValueList } from '@kbn/securitysolution-list-utils';

import type { DataViewBase } from '@kbn/es-query';
import {
  buildCombinedFilter,
  buildEmptyFilter,
  buildExistsFilter,
  buildPhraseFilter,
  buildPhrasesFilter,
} from '@kbn/es-query';
import type { Threshold, ThresholdNormalized } from './rule_schema';

export const hasLargeValueItem = (
  exceptionItems: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>
) => {
  return exceptionItems.some((exceptionItem) => hasLargeValueList(exceptionItem.entries));
};

export const hasNestedEntry = (entries: EntriesArray): boolean => {
  const found = entries.filter(({ type }) => type === 'nested');
  return found.length > 0;
};

export const transformExceptionsToFilter = (
  items: ExceptionsBuilderExceptionItem[],
  indexPattern: DataViewBase
) => {
  if (!items.length) {
    return buildEmptyFilter(false, indexPattern.title);
  }
  const { fields } = indexPattern;

  const itemsFilters = items.flatMap((item) => {
    const { entries } = item;
    const entryFilters = entries.map((entry) => {
      const [foundField] = fields.filter(({ name }) => entry.field != null && entry.field === name);

      switch (entry.type) {
        case 'match':
          const match = buildPhraseFilter(foundField, entry.value, indexPattern);

          return {
            ...match,
            meta: { ...match.meta, type: 'phrase', negate: entry.operator === 'excluded' },
          };
        case 'exists':
          const exists = buildExistsFilter(foundField, indexPattern);
          return {
            ...exists,
            meta: { ...exists.meta, type: 'exists', negate: entry.operator === 'excluded' },
          };
        case 'match_any':
          const matchAny = buildPhrasesFilter(foundField, entry.value, indexPattern);
          return {
            ...matchAny,
            meta: { ...matchAny.meta, type: 'phrases', negate: entry.operator === 'excluded' },
          };
        default:
          return buildEmptyFilter(false, indexPattern.title);
      }
    });
    if (entryFilters.length === 1) {
      return entryFilters;
    }
    return buildCombinedFilter('AND', entryFilters, indexPattern);
  });
  if (itemsFilters.length === 1) {
    return itemsFilters[0];
  }
  return buildCombinedFilter('OR', itemsFilters, indexPattern);
};

export const hasEqlSequenceQuery = (ruleQuery: string | undefined): boolean => {
  if (ruleQuery != null) {
    const parsedQuery = ruleQuery.trim().split(/[ \t\r\n]+/);
    return parsedQuery[0] === 'sequence' && parsedQuery[1] !== 'where';
  }
  return false;
};

// these functions should be typeguards and accept an entire rule.
export const isEqlRule = (ruleType: Type | undefined): boolean => ruleType === 'eql';
export const isThresholdRule = (ruleType: Type | undefined): boolean => ruleType === 'threshold';
export const isQueryRule = (ruleType: Type | undefined): boolean =>
  ruleType === 'query' || ruleType === 'saved_query';
export const isThreatMatchRule = (ruleType: Type | undefined): boolean =>
  ruleType === 'threat_match';
export const isMlRule = (ruleType: Type | undefined): boolean => ruleType === 'machine_learning';
export const isNewTermsRule = (ruleType: Type | undefined): boolean => ruleType === 'new_terms';

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
