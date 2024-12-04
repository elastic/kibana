/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AndCondition,
  conditionSchema,
  FilterCondition,
  filterConditionSchema,
  OrCondition,
} from '../../../../common/types';

export function isFilterCondition(subject: any): subject is FilterCondition {
  const result = filterConditionSchema.safeParse(subject);
  return result.success;
}

export function isAndCondition(subject: any): subject is AndCondition {
  const result = conditionSchema.safeParse(subject);
  return result.success && subject.and != null;
}

export function isOrCondition(subject: any): subject is OrCondition {
  const result = conditionSchema.safeParse(subject);
  return result.success && subject.or != null;
}
