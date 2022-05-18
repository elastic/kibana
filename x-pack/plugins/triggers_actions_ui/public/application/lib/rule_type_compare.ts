/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleTypeModel } from '../../types';
import { IsEnabledResult, IsDisabledResult } from './check_rule_type_enabled';

export function ruleTypeGroupCompare(
  left: [
    string,
    Array<{
      id: string;
      name: string;
      checkEnabledResult: IsEnabledResult | IsDisabledResult;
      ruleTypeItem: RuleTypeModel;
    }>
  ],
  right: [
    string,
    Array<{
      id: string;
      name: string;
      checkEnabledResult: IsEnabledResult | IsDisabledResult;
      ruleTypeItem: RuleTypeModel;
    }>
  ],
  groupNames: Map<string, string> | undefined
) {
  const groupNameA = left[0];
  const groupNameB = right[0];
  const leftRuleTypesList = left[1];
  const rightRuleTypesList = right[1];

  const hasEnabledRuleTypeInListLeft =
    leftRuleTypesList.find((ruleTypeItem) => ruleTypeItem.checkEnabledResult.isEnabled) !==
    undefined;

  const hasEnabledRuleTypeInListRight =
    rightRuleTypesList.find((ruleTypeItem) => ruleTypeItem.checkEnabledResult.isEnabled) !==
    undefined;

  if (hasEnabledRuleTypeInListLeft && !hasEnabledRuleTypeInListRight) {
    return -1;
  }
  if (!hasEnabledRuleTypeInListLeft && hasEnabledRuleTypeInListRight) {
    return 1;
  }

  return groupNames
    ? groupNames.get(groupNameA)!.localeCompare(groupNames.get(groupNameB)!)
    : groupNameA.localeCompare(groupNameB);
}

export function ruleTypeCompare(
  a: {
    id: string;
    name: string;
    checkEnabledResult: IsEnabledResult | IsDisabledResult;
    ruleTypeItem: RuleTypeModel;
  },
  b: {
    id: string;
    name: string;
    checkEnabledResult: IsEnabledResult | IsDisabledResult;
    ruleTypeItem: RuleTypeModel;
  }
) {
  if (a.checkEnabledResult.isEnabled === true && b.checkEnabledResult.isEnabled === false) {
    return -1;
  }
  if (a.checkEnabledResult.isEnabled === false && b.checkEnabledResult.isEnabled === true) {
    return 1;
  }
  return a.name.localeCompare(b.name);
}
