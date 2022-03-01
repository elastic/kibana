/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { pick } from 'lodash';
import { RuleTypeParams } from '../../../types';
import { InitialRule } from './rule_reducer';

const DEEP_COMPARE_FIELDS = ['tags', 'schedule', 'actions', 'notifyWhen'];

function getNonNullCompareFields(rule: InitialRule) {
  const { name, ruleTypeId, throttle } = rule;
  return {
    ...(!!(name && name.length > 0) ? { name } : {}),
    ...(!!(ruleTypeId && ruleTypeId.length > 0) ? { ruleTypeId } : {}),
    ...(!!(throttle && throttle.length > 0) ? { throttle } : {}),
  };
}

export function hasRuleChanged(a: InitialRule, b: InitialRule, compareParams: boolean) {
  // Deep compare these fields
  let objectsAreEqual = deepEqual(pick(a, DEEP_COMPARE_FIELDS), pick(b, DEEP_COMPARE_FIELDS));
  if (compareParams) {
    objectsAreEqual = objectsAreEqual && deepEqual(a.params, b.params);
  }

  const nonNullCompareFieldsAreEqual = deepEqual(
    getNonNullCompareFields(a),
    getNonNullCompareFields(b)
  );

  return !objectsAreEqual || !nonNullCompareFieldsAreEqual;
}

export function haveRuleParamsChanged(a: RuleTypeParams, b: RuleTypeParams) {
  return !deepEqual(a, b);
}
