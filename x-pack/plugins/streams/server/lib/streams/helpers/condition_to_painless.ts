/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoolean, isString } from 'lodash';
import {
  AndCondition,
  BinaryFilterCondition,
  Condition,
  conditionSchema,
  FilterCondition,
  filterConditionSchema,
  RerouteOrCondition,
  UnaryFilterCondition,
} from '../../../../common/types';

function isFilterCondition(subject: any): subject is FilterCondition {
  const result = filterConditionSchema.safeParse(subject);
  return result.success;
}

function isAndCondition(subject: any): subject is AndCondition {
  const result = conditionSchema.safeParse(subject);
  return result.success && subject.and != null;
}

function isOrCondition(subject: any): subject is RerouteOrCondition {
  const result = conditionSchema.safeParse(subject);
  return result.success && subject.or != null;
}

function safePainlessField(condition: FilterCondition) {
  return `ctx.${condition.field.split('.').join('?.')}`;
}

function encodeValue(value: string | number | boolean) {
  if (isString(value)) {
    return `"${value}"`;
  }
  if (isBoolean(value)) {
    return value ? 'true' : 'false';
  }
  return value;
}

function binaryToPainless(condition: BinaryFilterCondition) {
  switch (condition.operator) {
    case 'neq':
      return `${safePainlessField(condition)} != ${encodeValue(condition.value)}`;
    case 'lt':
      return `${safePainlessField(condition)} < ${encodeValue(condition.value)}`;
    case 'lte':
      return `${safePainlessField(condition)} <= ${encodeValue(condition.value)}`;
    case 'gt':
      return `${safePainlessField(condition)} > ${encodeValue(condition.value)}`;
    case 'gte':
      return `${safePainlessField(condition)} >= ${encodeValue(condition.value)}`;
    case 'startsWith':
      return `${safePainlessField(condition)}.startsWith(${encodeValue(condition.value)})`;
    case 'endsWith':
      return `${safePainlessField(condition)}.endsWith(${encodeValue(condition.value)})`;
    case 'contains':
      return `${safePainlessField(condition)}.contains(${encodeValue(condition.value)})`;
    default:
      return `${safePainlessField(condition)} == ${encodeValue(condition.value)}`;
  }
}

function unaryToPainless(condition: UnaryFilterCondition) {
  switch (condition.operator) {
    case 'notExists':
      return `${safePainlessField(condition)} == null`;
    default:
      return `${safePainlessField(condition)} !== null`;
  }
}

function isUnaryFilterCondition(subject: FilterCondition): subject is UnaryFilterCondition {
  return !('value' in subject);
}

export function conditionToPainless(condition: Condition, nested = false): string {
  if (isFilterCondition(condition)) {
    if (isUnaryFilterCondition(condition)) {
      return unaryToPainless(condition);
    }
    return `(${safePainlessField(condition)} !== null && ${binaryToPainless(condition)})`;
  }
  if (isAndCondition(condition)) {
    const and = condition.and.map((filter) => conditionToPainless(filter, true)).join(' && ');
    return nested ? `(${and})` : and;
  }
  if (isOrCondition(condition)) {
    const or = condition.or.map((filter) => conditionToPainless(filter, true)).join(' || ');
    return nested ? `(${or})` : or;
  }
  return 'false';
}
