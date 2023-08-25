/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod';

enum Comparator {
  GT = 'gt',
  LT = 'lt',
  GT_OR_EQ = 'gte',
  LT_OR_EQ = 'lte',
  BETWEEN = 'between',
  NOT_BETWEEN = 'not_between',
}

// Custom validations
const AggTypes = new Set(['count', 'avg', 'min', 'max', 'sum']);
const TimeWindowUnits = new Set(['s', 'm', 'h', 'd']);
const ComparatorFnNames = new Set([
  Comparator.GT,
  Comparator.LT,
  Comparator.GT_OR_EQ,
  Comparator.LT_OR_EQ,
  Comparator.BETWEEN,
  Comparator.NOT_BETWEEN,
]);

// Custom validation for aggType
function validateAggType(aggType: string) {
  if (!AggTypes.has(aggType)) {
    return 'invalid aggType';
  }
}

// Custom validation for groupBy
function validateGroupBy(groupBy: string) {
  if (!(groupBy === 'all' || groupBy === 'top')) {
    return 'invalid groupBy';
  }
}

// Custom validation for timeWindowUnit
function validateTimeWindowUnits(timeWindowUnit: string) {
  if (!TimeWindowUnits.has(timeWindowUnit)) {
    return 'invalid timeWindowUnit';
  }
}

// Custom validation for Kuery
function validateKuery(query: string) {
  try {
    // You can implement the actual validation logic here if needed.
    // For simplicity, I'm just returning undefined for now.
    toElasticsearchQuery(fromKueryExpression(query));
    return undefined;
  } catch (e) {
    return i18n.translate(
      'xpack.triggersActionsUI.data.coreQueryParams.invalidKQLQueryErrorMessage',
      {
        defaultMessage: 'Filter query is invalid.',
      }
    );
  }
}

// Custom comparator validation
function validateComparator(comparator: Comparator) {
  if (ComparatorFnNames.has(comparator)) return;

  return i18n.translate('xpack.stackAlerts.indexThreshold.invalidComparatorErrorMessage', {
    defaultMessage: 'invalid thresholdComparator specified: {comparator}',
    values: {
      comparator,
    },
  });
}

export const ParamsSchemaZod = z.object({
  index: z
    .union([z.string().min(1), z.array(z.string().min(1)).min(1)])
    .describe('name of the indices to search'),
  timeField: z.string().min(1).describe('field in index used for date/time'),
  aggType: z.string().refine(validateAggType).describe('aggregation type'),
  aggField: z.string().min(1).optional().describe('aggregation field'),
  groupBy: z.string().refine(validateGroupBy).describe('how to group'),
  termField: z.string().min(1).optional().describe('field to group on (for groupBy: top)'),
  filterKuery: z.string().refine(validateKuery).optional().describe('filter field'),
  termSize: z.number().min(1).optional().describe('limit on the number of groups returned'),
  timeWindowSize: z.number().min(1).describe('size of the time window for date range aggregations'),
  timeWindowUnit: z
    .string()
    .refine(validateTimeWindowUnits)
    .describe('units of the time window for date range aggregations'),
  thresholdComparator: z
    .enum([
      Comparator.GT,
      Comparator.LT,
      Comparator.GT_OR_EQ,
      Comparator.LT_OR_EQ,
      Comparator.BETWEEN,
      Comparator.NOT_BETWEEN,
    ])
    .refine(validateComparator)
    .describe('the comparison function to use to determine if the threshold has been met'),
  threshold: z.array(z.number()).min(1).max(2).describe('the values to use as the threshold'),
});
