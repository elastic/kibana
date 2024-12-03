/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoolean, isString, uniq } from 'lodash';
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

function safePainlessField(conditionOrField: FilterCondition | string) {
  if (isFilterCondition(conditionOrField)) {
    return `ctx.${conditionOrField.field.split('.').join('?.')}`;
  }
  return `ctx.${conditionOrField.split('.').join('?.')}`;
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
      return `((${safePainlessField(
        condition
      )} instanceof String && Float.parseFloat(${safePainlessField(condition)}) < ${encodeValue(
        Number(condition.value)
      )}) || ${safePainlessField(condition)} < ${encodeValue(Number(condition.value))})`;
    case 'lte':
      return `((${safePainlessField(
        condition
      )} instanceof String && Float.parseFloat(${safePainlessField(condition)}) <= ${encodeValue(
        Number(condition.value)
      )}) || ${safePainlessField(condition)} <= ${encodeValue(Number(condition.value))})`;
    case 'gt':
      return `((${safePainlessField(
        condition
      )} instanceof String && Float.parseFloat(${safePainlessField(condition)}) > ${encodeValue(
        Number(condition.value)
      )}) || ${safePainlessField(condition)} > ${encodeValue(Number(condition.value))})`;
    case 'gte':
      return `((${safePainlessField(
        condition
      )} instanceof String && Float.parseFloat(${safePainlessField(condition)}) >= ${encodeValue(
        Number(condition.value)
      )}) || ${safePainlessField(condition)} >= ${encodeValue(Number(condition.value))})`;
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

function extractAllFields(condition: Condition, fields: string[] = []): string[] {
  if (isFilterCondition(condition) && !isUnaryFilterCondition(condition)) {
    return uniq([...fields, condition.field]);
  } else if (isAndCondition(condition)) {
    return uniq(condition.and.map((cond) => extractAllFields(cond, fields)).flat());
  } else if (isOrCondition(condition)) {
    return uniq(condition.or.map((cond) => extractAllFields(cond, fields)).flat());
  }
  return uniq(fields);
}

export function conditionToStatement(condition: Condition, nested = false): string {
  if (isFilterCondition(condition)) {
    if (isUnaryFilterCondition(condition)) {
      return unaryToPainless(condition);
    }
    return `(${safePainlessField(condition)} !== null && ${binaryToPainless(condition)})`;
  }
  if (isAndCondition(condition)) {
    const and = condition.and.map((filter) => conditionToStatement(filter, true)).join(' && ');
    return nested ? `(${and})` : and;
  }
  if (isOrCondition(condition)) {
    const or = condition.or.map((filter) => conditionToStatement(filter, true)).join(' || ');
    return nested ? `(${or})` : or;
  }
  return 'false';
}

export function conditionToPainless(condition: Condition): string {
  const fields = extractAllFields(condition);
  let fieldCheck = '';
  if (fields.length !== 0) {
    fieldCheck = `if (${fields
      .map((field) => `${safePainlessField(field)} instanceof Map`)
      .join(' || ')}) {
  return false;
}
`;
  }
  return `${fieldCheck}try {
  if (${conditionToStatement(condition)}) {
    return true;
  }
  return false;
} catch (Exception e) {
  return false;
}
`;
}
