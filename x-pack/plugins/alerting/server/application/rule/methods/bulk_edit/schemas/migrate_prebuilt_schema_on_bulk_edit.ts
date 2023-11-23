/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RuleParams } from '../../../types';

const getPrebuiltValueForRuleBulkEdit = (
  ruleParams: RuleParams,
  isRuleUpdatedDuringBulkUpdate: boolean
) => {
  if (ruleParams?.prebuilt) {
    return {
      ...ruleParams.prebuilt,
      isCustomized: ruleParams.prebuilt.isCustomized || isRuleUpdatedDuringBulkUpdate,
    };
  }

  if (ruleParams.immutable) {
    return {
      isCustomized: isRuleUpdatedDuringBulkUpdate,
    };
  }

  return undefined;
};

export const migratePrebuiltSchemaOnRuleBulkEdit = (
  ruleParams: RuleParams,
  isRuleUpdatedDuringBulkUpdate: boolean
) => {
  const immutable = Boolean(ruleParams.prebuilt) || ruleParams.immutable;
  const prebuilt = getPrebuiltValueForRuleBulkEdit(ruleParams, isRuleUpdatedDuringBulkUpdate);

  ruleParams.prebuilt = prebuilt;
  ruleParams.immutable = immutable;
};
