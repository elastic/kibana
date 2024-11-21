/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Condition } from '../../../../common/types';
import { isAndCondition, isFilterCondition, isOrCondition } from './condition_guards';

export function getFields(condition: Condition): string[] {
  if (isFilterCondition(condition)) {
    return [condition.field];
  }
  if (isAndCondition(condition)) {
    return condition.and.flatMap(getFields);
  }
  if (isOrCondition(condition)) {
    return condition.or.flatMap(getFields);
  }
  return [];
}
